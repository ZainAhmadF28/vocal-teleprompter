package expo.modules.teleprompteroverlay

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.StyleSpan
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private data class WordRange(val start: Int, val end: Int)

/**
 * Floating Android system overlay for teleprompter text.
 *
 * JS owns STT/auto-scroll timing. Native owns the floating window, buttons,
 * drag-to-move, resize handles, highlighting, and scroll-to-current-word.
 */
class OverlayManager(
  private val context: Context,
  private val onControlPressed: (String) -> Unit,
  private val onPositionChanged: (Int, Int) -> Unit,
  private val onSizeChanged: (Int, Int) -> Unit
) {

  private var rootView: FrameLayout? = null
  private var scrollView: ScrollView? = null
  private var textView: TextView? = null
  private var readingLineView: View? = null
  private var modeButton: ImageButton? = null
  private var pauseButton: ImageButton? = null
  private var layoutParams: WindowManager.LayoutParams? = null

  private var scriptText = ""
  private var wordRanges: List<WordRange> = emptyList()
  private var currentWordIndex = -1
  private var isPaused = false
  private var scrollMode = "voice"
  private var speedLabel = "140"
  private var wpm = 140

  // Native auto-scroll timer (runs in main looper, survives JS background pause)
  private val autoHandler = Handler(Looper.getMainLooper())
  private var autoTask: Runnable? = null

  private val density: Float
    get() = context.resources.displayMetrics.density

  private val windowManager: WindowManager
    get() = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

  fun isShown(): Boolean = rootView != null

  fun show(
    text: String,
    fontSize: Float,
    fontColor: Int,
    backgroundColor: Int,
    opacity: Float,
    posX: Int,
    posY: Int,
    width: Int,
    height: Int,
    initialScrollMode: String,
    initialPaused: Boolean,
    initialSpeedLabel: String
  ) {
    scrollMode = initialScrollMode
    isPaused = initialPaused
    speedLabel = initialSpeedLabel

    if (rootView != null) {
      // Already shown — reuse existing window, just update state.
      setText(text)
      setScrollMode(initialScrollMode)
      setPaused(initialPaused)
      setSpeedLabel(initialSpeedLabel)
      syncAutoScrollState()
      return
    }

    val initialWidth = clampWidth(width)
    val initialHeight = clampHeight(height)

    val container = FrameLayout(context).apply {
      setBackgroundColor(applyAlpha(backgroundColor, opacity))
    }

    // ScrollView occupies content area between top handle and bottom controls.
    // Use FrameLayout margins instead of internal padding so that text never
    // renders under the drag handle or control bar.
    val sv = ScrollView(context).apply {
      isVerticalScrollBarEnabled = false
      overScrollMode = View.OVER_SCROLL_NEVER
      clipToPadding = true
    }

    val tv = TextView(context).apply {
      textSize = fontSize
      setTextColor(fontColor)
      setLineSpacing(0f, 1.15f)
    }

    sv.addView(
      tv,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
      )
    )

    container.addView(
      sv,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      ).apply {
        topMargin = topHandleHeight()
        bottomMargin = bottomControlsHeight()
      }
    )

    val readingLine = View(context).apply {
      setBackgroundColor(Color.parseColor("#3B82F6"))
      alpha = 0.65f
    }
    readingLineView = readingLine
    container.addView(
      readingLine,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        max(2, dpToPx(1.5f))
      ).apply {
        gravity = Gravity.TOP
        leftMargin = dpToPx(28f)
        rightMargin = dpToPx(28f)
      }
    )

    val dragHandle = makeTopHandle()
    container.addView(
      dragHandle,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        topHandleHeight()
      ).apply {
        gravity = Gravity.TOP
      }
    )

    val controls = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(dpToPx(8f), dpToPx(6f), dpToPx(8f), dpToPx(6f))
      setBackgroundColor(Color.argb(150, 0, 0, 0))
    }
    container.addView(
      controls,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        bottomControlsHeight()
      ).apply {
        gravity = Gravity.BOTTOM
      }
    )

    // Buttons toggle native state LOCALLY first, then notify JS for sync.
    // This way the action feels instant even if JS thread is paused (e.g. when
    // host activity is in background) and avoids waking the host activity.
    val modeBtn = makeControlButton(modeIcon(), "Ubah mode scroll") {
      handleToggleMode()
    }
    val pauseBtn = makeControlButton(pauseIcon(), "Pause atau lanjut") {
      handleTogglePause()
    }
    modeButton = modeBtn
    pauseButton = pauseBtn

    controls.addView(modeBtn)
    controls.addView(makeControlButton(R.drawable.ic_overlay_minus, "Perlambat") {
      handleSlower()
    })
    controls.addView(pauseBtn)
    controls.addView(makeControlButton(R.drawable.ic_overlay_plus, "Percepat") {
      handleFaster()
    })
    controls.addView(makeControlButton(R.drawable.ic_overlay_restart, "Mulai ulang") {
      handleRestart()
    })
    controls.addView(makeControlButton(R.drawable.ic_overlay_close, "Tutup overlay") {
      handleClose()
    })

    val rightResize = makeResizeHandle(R.drawable.ic_overlay_resize_width, "Resize horizontal")
    container.addView(
      rightResize,
      FrameLayout.LayoutParams(
        dpToPx(28f),
        FrameLayout.LayoutParams.MATCH_PARENT
      ).apply {
        gravity = Gravity.END
        topMargin = topHandleHeight()
        bottomMargin = bottomControlsHeight()
      }
    )

    val bottomResize = makeResizeHandle(R.drawable.ic_overlay_resize_height, "Resize vertikal")
    container.addView(
      bottomResize,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        dpToPx(26f)
      ).apply {
        gravity = Gravity.BOTTOM
        leftMargin = dpToPx(28f)
        rightMargin = dpToPx(72f)
        bottomMargin = bottomControlsHeight()
      }
    )

    val cornerResize = makeResizeHandle(R.drawable.ic_overlay_resize_both, "Resize bebas")
    container.addView(
      cornerResize,
      FrameLayout.LayoutParams(
        dpToPx(64f),
        dpToPx(42f)
      ).apply {
        gravity = Gravity.BOTTOM or Gravity.END
        bottomMargin = bottomControlsHeight()
      }
    )

    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }

    val flags =
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS

    val params = WindowManager.LayoutParams(
      initialWidth,
      initialHeight,
      type,
      flags,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = posX
      y = posY
    }

    attachDragListener(dragHandle, container, params)
    attachDragListener(sv, container, params)
    attachResizeListener(rightResize, container, params, resizeWidth = true, resizeHeight = false)
    attachResizeListener(bottomResize, container, params, resizeWidth = false, resizeHeight = true)
    attachResizeListener(cornerResize, container, params, resizeWidth = true, resizeHeight = true)

    windowManager.addView(container, params)

    rootView = container
    scrollView = sv
    textView = tv
    layoutParams = params

    wpm = initialSpeedLabel.toIntOrNull() ?: 140

    updateContentGeometry(initialHeight)
    setText(text)

    // Kick off auto-scroll right away if launched into auto mode.
    if (scrollMode == "auto" && !isPaused) {
      startAutoScrollTimer()
    }
  }

  fun setText(text: String) {
    scriptText = text
    wordRanges = tokenize(text)
    currentWordIndex = -1
    renderHighlightedText()
    scrollView?.scrollTo(0, 0)
  }

  fun setCurrentWordIndex(index: Int) {
    currentWordIndex = index.coerceIn(-1, max(-1, wordRanges.size - 1))
    renderHighlightedText()
    scrollToCurrentWord()
  }

  fun setPaused(paused: Boolean) {
    isPaused = paused
    pauseButton?.setImageResource(pauseIcon())
    syncAutoScrollState()
  }

  fun setScrollMode(mode: String) {
    scrollMode = mode
    modeButton?.setImageResource(modeIcon())
    syncAutoScrollState()
  }

  fun setSpeedLabel(label: String) {
    speedLabel = label
    label.toIntOrNull()?.let { wpm = max(40, min(400, it)) }
    modeButton?.setImageResource(modeIcon())
    if (scrollMode == "auto" && !isPaused && autoTask != null) {
      startAutoScrollTimer() // restart with new interval
    }
  }

  fun setWpm(value: Int) {
    wpm = max(40, min(400, value))
    speedLabel = wpm.toString()
    modeButton?.setImageResource(modeIcon())
    if (scrollMode == "auto" && !isPaused && autoTask != null) {
      startAutoScrollTimer()
    }
  }

  // ---------------------------------------------------------------------------
  // Native action handlers — invoked from button taps. These mutate state
  // locally so the overlay responds instantly without waiting for JS, then
  // emit an event so JS can mirror state in its store.
  // ---------------------------------------------------------------------------

  private fun handleToggleMode() {
    scrollMode = if (scrollMode == "auto") "voice" else "auto"
    modeButton?.setImageResource(modeIcon())
    syncAutoScrollState()
    onControlPressed("toggleMode")
  }

  private fun handleTogglePause() {
    isPaused = !isPaused
    pauseButton?.setImageResource(pauseIcon())
    syncAutoScrollState()
    onControlPressed("togglePause")
  }

  private fun handleSlower() {
    setWpm(wpm - 20)
    onControlPressed("slower")
  }

  private fun handleFaster() {
    setWpm(wpm + 20)
    onControlPressed("faster")
  }

  private fun handleRestart() {
    currentWordIndex = -1
    renderHighlightedText()
    scrollView?.scrollTo(0, 0)
    syncAutoScrollState()
    onControlPressed("restart")
  }

  private fun handleClose() {
    stopAutoScrollTimer()
    onControlPressed("close")
  }

  // ---------------------------------------------------------------------------
  // Native auto-scroll timer — runs on main looper so it survives JS thread
  // throttling when host activity is paused. Increments currentWordIndex at
  // a cadence derived from wpm (defaults to 140 wpm = ~430ms/word).
  // ---------------------------------------------------------------------------

  private fun startAutoScrollTimer() {
    stopAutoScrollTimer()
    val intervalMs = max(80L, 60_000L / max(40, wpm).toLong())
    val task = object : Runnable {
      override fun run() {
        if (!isPaused && scrollMode == "auto" && currentWordIndex + 1 < wordRanges.size) {
          currentWordIndex += 1
          renderHighlightedText()
          scrollToCurrentWord()
        }
        autoHandler.postDelayed(this, intervalMs)
      }
    }
    autoTask = task
    autoHandler.postDelayed(task, intervalMs)
  }

  private fun stopAutoScrollTimer() {
    autoTask?.let { autoHandler.removeCallbacks(it) }
    autoTask = null
  }

  private fun syncAutoScrollState() {
    if (scrollMode == "auto" && !isPaused) {
      startAutoScrollTimer()
    } else {
      stopAutoScrollTimer()
    }
  }

  fun setScrollPosition(y: Float) {
    scrollView?.scrollTo(0, max(0, y.toInt()))
  }

  fun setOpacity(opacity: Float) {
    rootView?.alpha = opacity.coerceIn(0f, 1f)
  }

  fun hide() {
    stopAutoScrollTimer()
    val v = rootView ?: return
    try {
      windowManager.removeView(v)
    } catch (_: IllegalArgumentException) {
      // Already removed.
    }
    rootView = null
    scrollView = null
    textView = null
    readingLineView = null
    modeButton = null
    pauseButton = null
    layoutParams = null
  }

  private fun makeControlButton(iconRes: Int, description: String, onClick: () -> Unit): ImageButton {
    return ImageButton(context).apply {
      setImageResource(iconRes)
      setColorFilter(Color.WHITE)
      scaleType = ImageView.ScaleType.CENTER
      adjustViewBounds = false
      contentDescription = description
      setPadding(dpToPx(10f), dpToPx(10f), dpToPx(10f), dpToPx(10f))
      setBackgroundColor(Color.TRANSPARENT)
      setOnClickListener { onClick() }
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f).apply {
        leftMargin = dpToPx(4f)
        rightMargin = dpToPx(4f)
      }
    }
  }

  private fun makeResizeHandle(iconRes: Int, description: String): ImageButton {
    return ImageButton(context).apply {
      setImageResource(iconRes)
      setColorFilter(Color.argb(230, 255, 255, 255))
      scaleType = ImageView.ScaleType.CENTER
      contentDescription = description
      setPadding(dpToPx(4f), dpToPx(4f), dpToPx(4f), dpToPx(4f))
      setBackgroundColor(Color.TRANSPARENT)
    }
  }

  private fun makeTopHandle(): ImageButton {
    return ImageButton(context).apply {
      setImageResource(R.drawable.ic_overlay_drag_handle)
      setColorFilter(Color.argb(210, 255, 255, 255))
      scaleType = ImageView.ScaleType.CENTER
      contentDescription = "Geser overlay"
      setPadding(dpToPx(8f), dpToPx(7f), dpToPx(8f), dpToPx(7f))
      setBackgroundColor(Color.argb(125, 0, 0, 0))
    }
  }

  private fun modeIcon(): Int {
    return if (scrollMode == "auto") {
      R.drawable.ic_overlay_gauge
    } else {
      R.drawable.ic_overlay_voice
    }
  }

  private fun pauseIcon(): Int {
    return if (isPaused) {
      R.drawable.ic_overlay_play
    } else {
      R.drawable.ic_overlay_pause
    }
  }

  private fun modeLabel(): String {
    return if (scrollMode == "auto") {
      "AUTO $speedLabel"
    } else {
      "VOICE"
    }
  }

  private fun renderHighlightedText() {
    val tv = textView ?: return
    val spannable = SpannableString(scriptText)

    wordRanges.forEachIndexed { index, range ->
      val color = when {
        index == currentWordIndex -> Color.parseColor("#3B82F6")
        index < currentWordIndex -> Color.argb(120, 255, 255, 255)
        else -> Color.WHITE
      }
      spannable.setSpan(
        ForegroundColorSpan(color),
        range.start,
        range.end,
        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
      )
      if (index == currentWordIndex) {
        spannable.setSpan(
          StyleSpan(Typeface.BOLD),
          range.start,
          range.end,
          Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        )
      }
    }

    tv.text = spannable
  }

  private fun scrollToCurrentWord() {
    val tv = textView ?: return
    val sv = scrollView ?: return
    val root = rootView ?: return

    if (currentWordIndex < 0 || currentWordIndex >= wordRanges.size) {
      sv.scrollTo(0, 0)
      return
    }

    val layout = tv.layout
    if (layout == null) {
      tv.post { scrollToCurrentWord() }
      return
    }

    // Reading line is at 30% of CONTENT area (between handle and controls),
    // not 30% of root, so the math stays correct on small overlays.
    val contentHeight = max(0, root.height - topHandleHeight() - bottomControlsHeight())
    val readingOffset = (contentHeight * 0.30f).toInt()

    val start = wordRanges[currentWordIndex].start
    val line = layout.getLineForOffset(start)
    val lineTop = layout.getLineTop(line)
    sv.scrollTo(0, max(0, lineTop - readingOffset))
  }

  private fun tokenize(text: String): List<WordRange> {
    return Regex("\\S+").findAll(text).map {
      WordRange(it.range.first, it.range.last + 1)
    }.toList()
  }

  private fun attachDragListener(touchView: View, movedView: View, params: WindowManager.LayoutParams) {
    var initialX = 0
    var initialY = 0
    var touchStartX = 0f
    var touchStartY = 0f
    var dragging = false
    val slop = ViewConfiguration.get(context).scaledTouchSlop

    touchView.setOnTouchListener { _, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          initialX = params.x
          initialY = params.y
          touchStartX = event.rawX
          touchStartY = event.rawY
          dragging = false
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - touchStartX
          val dy = event.rawY - touchStartY
          if (!dragging && (abs(dx) > slop || abs(dy) > slop)) {
            dragging = true
          }
          if (dragging) {
            params.x = initialX + dx.toInt()
            params.y = initialY + dy.toInt()
            updateWindowLayout(movedView, params)
          }
          true
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          if (dragging) {
            onPositionChanged(pxToDp(params.x), pxToDp(params.y))
          }
          true
        }
        else -> false
      }
    }
  }

  private fun attachResizeListener(
    touchView: View,
    movedView: View,
    params: WindowManager.LayoutParams,
    resizeWidth: Boolean,
    resizeHeight: Boolean
  ) {
    var initialWidth = 0
    var initialHeight = 0
    var touchStartX = 0f
    var touchStartY = 0f

    touchView.setOnTouchListener { _, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          initialWidth = params.width
          initialHeight = params.height
          touchStartX = event.rawX
          touchStartY = event.rawY
          true
        }
        MotionEvent.ACTION_MOVE -> {
          if (resizeWidth) {
            params.width = clampWidth(initialWidth + (event.rawX - touchStartX).toInt())
          }
          if (resizeHeight) {
            params.height = clampHeight(initialHeight + (event.rawY - touchStartY).toInt())
          }
          updateContentGeometry(params.height)
          updateWindowLayout(movedView, params)
          true
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          onSizeChanged(pxToDp(params.width), pxToDp(params.height))
          true
        }
        else -> false
      }
    }
  }

  private fun updateWindowLayout(view: View, params: WindowManager.LayoutParams) {
    try {
      windowManager.updateViewLayout(view, params)
    } catch (_: Exception) {
      // View may already be detached.
    }
  }

  /**
   * Recalculates layout-dependent values whenever overlay height changes.
   *
   * Goals:
   *  - Top of script ALWAYS sits at the top of the content area (small fixed
   *    padding), no matter how tall the overlay is — so first word stays
   *    visible from the start.
   *  - Reading line sits at 30% of the *content* area (between handle and
   *    controls), giving roughly 1/3 already-read context above and 2/3
   *    upcoming text below the focus line.
   *  - Bottom padding is large enough that the LAST line of the script can
   *    still scroll up to the reading line.
   *  - Side padding stays comfortable for reading.
   */
  private fun updateContentGeometry(height: Int) {
    val tv = textView ?: return
    val line = readingLineView
    val contentHeight = max(0, height - topHandleHeight() - bottomControlsHeight())

    val topPadding = dpToPx(16f) // small constant — top of script stays at top
    val readingOffset = (contentHeight * 0.30f).toInt()
    // Bottom padding: empty space below script so last line can reach reading line.
    val bottomPadding = max(dpToPx(16f), contentHeight - readingOffset - dpToPx(16f))
    val sidePadding = dpToPx(24f)

    tv.setPadding(sidePadding, topPadding, sidePadding, bottomPadding)

    val lp = line?.layoutParams as? FrameLayout.LayoutParams
    if (lp != null) {
      // Reading line sits relative to the *container*, so add top handle offset.
      lp.topMargin = topHandleHeight() + readingOffset
      line.layoutParams = lp
    }

    tv.post { scrollToCurrentWord() }
  }

  private fun clampWidth(width: Int): Int {
    val screenWidth = context.resources.displayMetrics.widthPixels
    return min(max(width, dpToPx(260f)), (screenWidth * 0.98f).roundToInt())
  }

  private fun clampHeight(height: Int): Int {
    val screenHeight = context.resources.displayMetrics.heightPixels
    return min(max(height, dpToPx(170f)), (screenHeight * 0.86f).roundToInt())
  }

  private fun topHandleHeight(): Int = dpToPx(36f)

  private fun bottomControlsHeight(): Int = dpToPx(58f)

  private fun dpToPx(dp: Float): Int = (dp * density).roundToInt()

  private fun pxToDp(px: Int): Int = (px / density).roundToInt()

  private fun applyAlpha(color: Int, alpha: Float): Int {
    val a = (alpha.coerceIn(0f, 1f) * 255).toInt()
    return Color.argb(a, Color.red(color), Color.green(color), Color.blue(color))
  }
}
