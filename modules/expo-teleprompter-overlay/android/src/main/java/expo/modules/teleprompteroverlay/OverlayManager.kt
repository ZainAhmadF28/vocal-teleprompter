package expo.modules.teleprompteroverlay

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.RenderEffect
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
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
 * Visual layout (matches the merged Editor / preflight design):
 *   [mode label pill]                                   <- top-left badge
 *   [drag · ◁◁ ▷▷ ↻ [PAUSE] window eye X]               <- toolbar pill
 *   [card with karaoke text + corner resize]            <- text card
 *
 * Backdrop modes change ONLY the text card's background:
 *   - transparent : no fill, dashed outline (text floats over screen)
 *   - dim         : solid dark fill
 *   - blur        : translucent fill + RenderEffect blur (API 31+, fallback dim)
 *
 * Toolbar can be hidden via the eye button — mode label pill becomes drag target
 * and a single eye-off circle appears in the card's top-right.
 */
class OverlayManager(
  private val context: Context,
  private val onControlPressed: (String) -> Unit,
  private val onPositionChanged: (Int, Int) -> Unit,
  private val onSizeChanged: (Int, Int) -> Unit,
  private val onIndexChanged: (Int) -> Unit = {}
) {

  // Palette aligned with the Editor design (neon green accent on dark chrome).
  private val NEON = Color.parseColor("#BFEF3F")
  private val SPOKEN_TEXT = Color.parseColor("#5C5F66")
  private val UPCOMING_TEXT = Color.WHITE
  private val DARK_FILL = Color.parseColor("#14181B")
  private val BTN_BG = Color.parseColor("#2A2D31")
  private val ICON_TINT = Color.parseColor("#E5E7EB")
  private val DANGER_FG = Color.parseColor("#EF4444")
  private val DANGER_BG = Color.parseColor("#3A1419")
  private val LABEL_FG = Color.parseColor("#FAFAFA")
  private val LABEL_DIM = Color.parseColor("#A1A1AA")

  private var rootView: FrameLayout? = null
  private var modeLabelView: LinearLayout? = null
  private var modeLabelText: TextView? = null
  private var toolbarView: LinearLayout? = null
  private var cardView: FrameLayout? = null
  private var cardBackgroundView: View? = null
  private var scrollView: ScrollView? = null
  private var textView: TextView? = null
  private var pauseButton: ImageButton? = null
  private var modeButton: ImageButton? = null
  private var windowButton: ImageButton? = null
  private var eyeToggleButton: ImageButton? = null
  private var collapsedEyeButton: ImageButton? = null
  private var resizeHandle: ImageButton? = null
  private var layoutParams: WindowManager.LayoutParams? = null

  private var scriptText = ""
  private var wordRanges: List<WordRange> = emptyList()
  private var currentWordIndex = -1
  private var isPaused = false
  private var scrollMode = "voice"
  private var speedLabel = "140"
  private var wpm = 140
  private var backdrop = "dim"
  private var toolbarVisible = true

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
    initialSpeedLabel: String,
    initialBackdrop: String
  ) {
    scrollMode = initialScrollMode
    isPaused = initialPaused
    speedLabel = initialSpeedLabel
    backdrop = normalizeBackdrop(initialBackdrop)

    if (rootView != null) {
      setText(text)
      setScrollMode(initialScrollMode)
      setPaused(initialPaused)
      setSpeedLabel(initialSpeedLabel)
      setBackdrop(initialBackdrop)
      syncAutoScrollState()
      return
    }

    val initialWidth = clampWidth(width)
    val initialHeight = clampHeight(height)

    val container = FrameLayout(context).apply {
      // Container is fully transparent; only inner pieces draw chrome.
      setBackgroundColor(Color.TRANSPARENT)
    }

    // ---- Mode label pill (top-left) ---------------------------------------
    val labelPill = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      background = pillDrawable(DARK_FILL, dpToPx(999f).toFloat())
      setPadding(dpToPx(12f), dpToPx(6f), dpToPx(12f), dpToPx(6f))
    }
    val dot = View(context).apply {
      background = circleDrawable(NEON)
    }
    labelPill.addView(
      dot,
      LinearLayout.LayoutParams(dpToPx(8f), dpToPx(8f)).apply {
        rightMargin = dpToPx(8f)
      }
    )
    val labelText = TextView(context).apply {
      textSize = 11f
      setTextColor(LABEL_FG)
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      letterSpacing = 0.08f
      setText(computeModeLabel())
    }
    labelPill.addView(labelText)

    container.addView(
      labelPill,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.WRAP_CONTENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        gravity = Gravity.TOP or Gravity.START
        leftMargin = dpToPx(8f)
        topMargin = dpToPx(4f)
      }
    )

    // ---- Toolbar pill (top, full-ish width, contains buttons) -------------
    val toolbar = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      background = pillDrawable(DARK_FILL, dpToPx(28f).toFloat())
      setPadding(dpToPx(8f), dpToPx(6f), dpToPx(8f), dpToPx(6f))
    }

    val handleStripe = View(context).apply {
      background = pillDrawable(Color.parseColor("#3F3F46"), dpToPx(2f).toFloat())
    }
    toolbar.addView(
      handleStripe,
      LinearLayout.LayoutParams(dpToPx(20f), dpToPx(3f)).apply {
        leftMargin = dpToPx(6f)
        rightMargin = dpToPx(8f)
      }
    )

    val rewindBtn = makeRoundButton(R.drawable.ic_overlay_rewind, "Perlambat") {
      handleSlower()
    }
    val forwardBtn = makeRoundButton(R.drawable.ic_overlay_forward, "Percepat") {
      handleFaster()
    }
    val modeBtn = makeRoundButton(modeIcon(), "Ubah mode scroll") {
      handleToggleMode()
    }
    modeButton = modeBtn
    refreshModeAppearance()
    val restartBtn = makeRoundButton(R.drawable.ic_overlay_restart, "Mulai ulang") {
      handleRestart()
    }
    val pauseBtn = makeRoundButton(pauseIcon(), "Pause atau lanjut") {
      handleTogglePause()
    }
    pauseButton = pauseBtn
    refreshPauseAppearance()
    val windowBtn = makeRoundButton(R.drawable.ic_overlay_window, "Ubah backdrop") {
      handleToggleBackdrop()
    }
    windowButton = windowBtn
    val eyeBtn = makeRoundButton(R.drawable.ic_overlay_eye_off, "Sembunyikan toolbar") {
      handleToggleToolbar()
    }
    eyeToggleButton = eyeBtn
    val closeBtn = makeRoundButton(R.drawable.ic_overlay_close, "Tutup overlay") {
      handleClose()
    }
    closeBtn.setColorFilter(DANGER_FG)
    closeBtn.background = circleDrawable(DANGER_BG)

    toolbar.addView(modeBtn)
    toolbar.addView(rewindBtn)
    toolbar.addView(forwardBtn)
    toolbar.addView(restartBtn)
    toolbar.addView(pauseBtn)
    toolbar.addView(windowBtn)
    toolbar.addView(eyeBtn)
    toolbar.addView(closeBtn)

    container.addView(
      toolbar,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        toolbarHeight()
      ).apply {
        gravity = Gravity.TOP
        leftMargin = dpToPx(4f)
        rightMargin = dpToPx(4f)
        topMargin = topToolbarOffset()
      }
    )

    // ---- Text card (positioned below toolbar) -----------------------------
    val card = FrameLayout(context)
    cardView = card

    val cardBackground = View(context)
    cardBackgroundView = cardBackground
    card.addView(
      cardBackground,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    )

    val sv = ScrollView(context).apply {
      isVerticalScrollBarEnabled = false
      overScrollMode = View.OVER_SCROLL_NEVER
      clipToPadding = true
    }

    val tv = TextView(context).apply {
      textSize = fontSize
      setTextColor(UPCOMING_TEXT)
      setLineSpacing(0f, 1.25f)
      typeface = Typeface.DEFAULT
    }
    sv.addView(
      tv,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
      )
    )
    card.addView(
      sv,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    )

    // Eye button shown ONLY when toolbar is hidden — sits in card top-right.
    val collapsedEye = makeRoundButton(R.drawable.ic_overlay_eye, "Tampilkan toolbar") {
      handleToggleToolbar()
    }
    collapsedEyeButton = collapsedEye
    card.addView(
      collapsedEye,
      FrameLayout.LayoutParams(roundButtonSize(), roundButtonSize()).apply {
        gravity = Gravity.TOP or Gravity.END
        topMargin = dpToPx(8f)
        rightMargin = dpToPx(8f)
      }
    )
    collapsedEye.visibility = View.GONE

    val cornerResize = makeResizeHandle()
    resizeHandle = cornerResize
    card.addView(
      cornerResize,
      FrameLayout.LayoutParams(dpToPx(28f), dpToPx(28f)).apply {
        gravity = Gravity.BOTTOM or Gravity.END
        bottomMargin = dpToPx(6f)
        rightMargin = dpToPx(6f)
      }
    )

    container.addView(
      card,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      ).apply {
        topMargin = cardTopMargin()
        leftMargin = dpToPx(4f)
        rightMargin = dpToPx(4f)
        bottomMargin = dpToPx(4f)
      }
    )

    // ---- Window params + listeners ----------------------------------------
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

    attachDragListener(labelPill, container, params)
    attachDragListener(toolbar, container, params)
    attachDragListener(cardBackground, container, params)
    attachResizeListener(cornerResize, container, params)

    windowManager.addView(container, params)

    rootView = container
    modeLabelView = labelPill
    modeLabelText = labelText
    toolbarView = toolbar
    scrollView = sv
    textView = tv
    layoutParams = params

    wpm = initialSpeedLabel.toIntOrNull() ?: 140

    applyBackdropStyle()
    refreshPauseAppearance()
    refreshModeLabel()
    updateContentGeometry(initialHeight)
    setText(text)

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
    refreshPauseAppearance()
    syncAutoScrollState()
  }

  fun setScrollMode(mode: String) {
    scrollMode = mode
    refreshModeAppearance()
    syncAutoScrollState()
  }

  fun setSpeedLabel(label: String) {
    speedLabel = label
    label.toIntOrNull()?.let { wpm = max(40, min(400, it)) }
    if (scrollMode == "auto" && !isPaused && autoTask != null) {
      startAutoScrollTimer()
    }
  }

  fun setWpm(value: Int) {
    wpm = max(40, min(400, value))
    speedLabel = wpm.toString()
    if (scrollMode == "auto" && !isPaused && autoTask != null) {
      startAutoScrollTimer()
    }
  }

  fun setBackdrop(mode: String) {
    backdrop = normalizeBackdrop(mode)
    applyBackdropStyle()
    refreshModeLabel()
  }

  fun setToolbarVisible(visible: Boolean) {
    toolbarVisible = visible
    toolbarView?.visibility = if (visible) View.VISIBLE else View.GONE
    collapsedEyeButton?.visibility = if (visible) View.GONE else View.VISIBLE
    val card = cardView ?: return
    val lp = card.layoutParams as? FrameLayout.LayoutParams ?: return
    lp.topMargin = cardTopMargin()
    card.layoutParams = lp
    layoutParams?.height?.let { updateContentGeometry(it) }
    refreshModeLabel()
  }

  // ---------------------------------------------------------------------------
  // Action handlers — invoked from button taps. Mutate state locally so the
  // overlay responds instantly without waiting for JS, then emit an event so
  // JS can mirror state in its store.
  // ---------------------------------------------------------------------------

  private fun handleTogglePause() {
    isPaused = !isPaused
    refreshPauseAppearance()
    syncAutoScrollState()
    onControlPressed("togglePause")
  }

  private fun handleToggleMode() {
    scrollMode = if (scrollMode == "auto") "voice" else "auto"
    refreshModeAppearance()
    syncAutoScrollState()
    onControlPressed("toggleMode")
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
    onIndexChanged(currentWordIndex)
    onControlPressed("restart")
  }

  private fun handleClose() {
    stopAutoScrollTimer()
    onControlPressed("close")
  }

  private fun handleToggleBackdrop() {
    val next = when (backdrop) {
      "transparent" -> "dim"
      "dim" -> "blur"
      else -> "transparent"
    }
    setBackdrop(next)
    onControlPressed("toggleBackdrop")
  }

  private fun handleToggleToolbar() {
    setToolbarVisible(!toolbarVisible)
    onControlPressed("toggleToolbar")
  }

  // ---------------------------------------------------------------------------
  // Auto-scroll timer
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
          onIndexChanged(currentWordIndex)
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
    modeLabelView = null
    modeLabelText = null
    toolbarView = null
    cardView = null
    cardBackgroundView = null
    scrollView = null
    textView = null
    pauseButton = null
    modeButton = null
    windowButton = null
    eyeToggleButton = null
    collapsedEyeButton = null
    resizeHandle = null
    layoutParams = null
  }

  // ---------------------------------------------------------------------------
  // View builders / styling helpers
  // ---------------------------------------------------------------------------

  private fun makeRoundButton(iconRes: Int, description: String, onClick: () -> Unit): ImageButton {
    val size = roundButtonSize()
    return ImageButton(context).apply {
      setImageResource(iconRes)
      setColorFilter(ICON_TINT)
      scaleType = ImageView.ScaleType.CENTER_INSIDE
      contentDescription = description
      background = circleDrawable(BTN_BG)
      setPadding(dpToPx(7f), dpToPx(7f), dpToPx(7f), dpToPx(7f))
      setOnClickListener { onClick() }
      val lp = LinearLayout.LayoutParams(size, size)
      lp.leftMargin = dpToPx(2f)
      lp.rightMargin = dpToPx(2f)
      layoutParams = lp
    }
  }

  private fun makeResizeHandle(): ImageButton {
    return ImageButton(context).apply {
      setImageResource(R.drawable.ic_overlay_resize_both)
      setColorFilter(Color.argb(220, 230, 230, 235))
      scaleType = ImageView.ScaleType.CENTER_INSIDE
      contentDescription = "Resize"
      setPadding(dpToPx(4f), dpToPx(4f), dpToPx(4f), dpToPx(4f))
      setBackgroundColor(Color.TRANSPARENT)
    }
  }

  private fun pillDrawable(color: Int, radius: Float): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      setColor(color)
      cornerRadius = radius
    }
  }

  private fun circleDrawable(color: Int): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(color)
    }
  }

  private fun dashedOutlineDrawable(): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = dpToPx(20f).toFloat()
      setColor(Color.TRANSPARENT)
      setStroke(
        dpToPx(1.5f),
        Color.argb(170, 255, 255, 255),
        dpToPx(6f).toFloat(),
        dpToPx(4f).toFloat()
      )
    }
  }

  private fun applyBackdropStyle() {
    val bg = cardBackgroundView ?: return
    when (backdrop) {
      "transparent" -> {
        bg.background = dashedOutlineDrawable()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          bg.setRenderEffect(null)
        }
      }
      "blur" -> {
        // Translucent fill so the blur has something to compose against; on
        // pre-S devices this gracefully degrades to a frosted look.
        bg.background = pillDrawable(Color.argb(120, 30, 30, 35), dpToPx(20f).toFloat())
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          bg.setRenderEffect(
            RenderEffect.createBlurEffect(24f, 24f, Shader.TileMode.CLAMP)
          )
        }
      }
      else -> { // "dim"
        bg.background = pillDrawable(Color.argb(228, 18, 22, 26), dpToPx(20f).toFloat())
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          bg.setRenderEffect(null)
        }
      }
    }
    refreshModeLabel()
  }

  private fun refreshPauseAppearance() {
    val btn = pauseButton ?: return
    btn.setImageResource(pauseIcon())
    if (!isPaused) {
      btn.background = circleDrawable(NEON)
      btn.setColorFilter(Color.parseColor("#0A0A0F"))
    } else {
      btn.background = circleDrawable(BTN_BG)
      btn.setColorFilter(ICON_TINT)
    }
  }

  private fun refreshModeAppearance() {
    val btn = modeButton ?: return
    btn.setImageResource(modeIcon())
    // Tint slightly so the active mode reads as accent without stealing focus
    // from the primary pause control.
    btn.setColorFilter(if (scrollMode == "auto") NEON else ICON_TINT)
  }

  private fun refreshModeLabel() {
    modeLabelText?.text = computeModeLabel()
  }

  private fun computeModeLabel(): String {
    if (!toolbarVisible) return "04 · TOOLBAR HIDDEN"
    return when (backdrop) {
      "transparent" -> "01 · TRANSPARENT"
      "blur" -> "03 · BLUR"
      else -> "02 · DIM"
    }
  }

  private fun pauseIcon(): Int =
    if (isPaused) R.drawable.ic_overlay_play else R.drawable.ic_overlay_pause

  private fun modeIcon(): Int =
    if (scrollMode == "auto") R.drawable.ic_overlay_gauge else R.drawable.ic_overlay_voice

  // ---------------------------------------------------------------------------
  // Highlighting / scroll
  // ---------------------------------------------------------------------------

  private fun renderHighlightedText() {
    val tv = textView ?: return
    val spannable = SpannableString(scriptText)

    wordRanges.forEachIndexed { index, range ->
      val color = when {
        index == currentWordIndex -> NEON
        index < currentWordIndex -> SPOKEN_TEXT
        else -> UPCOMING_TEXT
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
    val card = cardView ?: return

    if (currentWordIndex < 0 || currentWordIndex >= wordRanges.size) {
      sv.scrollTo(0, 0)
      return
    }

    val layout = tv.layout
    if (layout == null) {
      tv.post { scrollToCurrentWord() }
      return
    }

    val readingOffset = (card.height * 0.30f).toInt()
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

  // ---------------------------------------------------------------------------
  // Drag / resize listeners
  // ---------------------------------------------------------------------------

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
    params: WindowManager.LayoutParams
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
          params.width = clampWidth(initialWidth + (event.rawX - touchStartX).toInt())
          params.height = clampHeight(initialHeight + (event.rawY - touchStartY).toInt())
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

  private fun updateContentGeometry(height: Int) {
    val tv = textView ?: return
    val card = cardView ?: return
    val cardHeight = max(0, height - cardTopMargin() - dpToPx(4f))

    val topPadding = dpToPx(20f)
    val readingOffset = (cardHeight * 0.30f).toInt()
    val bottomPadding = max(dpToPx(20f), cardHeight - readingOffset - dpToPx(20f))
    val sidePadding = dpToPx(24f)
    tv.setPadding(sidePadding, topPadding, sidePadding, bottomPadding)

    tv.post { scrollToCurrentWord() }
  }

  private fun clampWidth(width: Int): Int {
    val screenWidth = context.resources.displayMetrics.widthPixels
    return min(max(width, dpToPx(260f)), (screenWidth * 0.98f).roundToInt())
  }

  private fun clampHeight(height: Int): Int {
    val screenHeight = context.resources.displayMetrics.heightPixels
    return min(max(height, dpToPx(180f)), (screenHeight * 0.86f).roundToInt())
  }

  private fun roundButtonSize(): Int = dpToPx(38f)
  private fun toolbarHeight(): Int = dpToPx(54f)
  private fun topToolbarOffset(): Int = dpToPx(40f)
  private fun cardTopMargin(): Int =
    if (toolbarVisible) topToolbarOffset() + toolbarHeight() + dpToPx(8f) else dpToPx(40f)

  private fun dpToPx(dp: Float): Int = (dp * density).roundToInt()
  private fun pxToDp(px: Int): Int = (px / density).roundToInt()

  private fun normalizeBackdrop(mode: String): String =
    when (mode.lowercase()) {
      "transparent", "blur", "dim" -> mode.lowercase()
      else -> "dim"
    }
}
