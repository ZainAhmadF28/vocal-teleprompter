package expo.modules.teleprompteroverlay

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.ContextCompat
import kotlin.math.max

/**
 * Manages a floating system-overlay view that shows scrolling teleprompter text.
 *
 * Limitations of this v1:
 *   - Single global overlay instance
 *   - Drag-to-move handled here (basic touch listener)
 *   - Text scroll via setScrollY on inner ScrollView
 */
class OverlayManager(private val context: Context) {

  private var rootView: FrameLayout? = null
  private var scrollView: ScrollView? = null
  private var textView: TextView? = null
  private var layoutParams: WindowManager.LayoutParams? = null

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
    height: Int
  ) {
    if (rootView != null) {
      // Already shown — update text & params instead
      setText(text)
      return
    }

    val container = FrameLayout(context).apply {
      setBackgroundColor(applyAlpha(backgroundColor, opacity))
    }

    val sv = ScrollView(context).apply {
      isVerticalScrollBarEnabled = false
      overScrollMode = View.OVER_SCROLL_NEVER
    }

    val tv = TextView(context).apply {
      this.text = text
      textSize = fontSize
      setTextColor(fontColor)
      setPadding(28, 24, 28, 24)
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
      )
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
      width,
      height,
      type,
      flags,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = posX
      y = posY
    }

    attachDragListener(container, params)

    windowManager.addView(container, params)

    rootView = container
    scrollView = sv
    textView = tv
    layoutParams = params
  }

  fun setText(text: String) {
    textView?.text = text
  }

  fun setScrollPosition(y: Float) {
    scrollView?.scrollTo(0, max(0, y.toInt()))
  }

  fun setOpacity(opacity: Float) {
    rootView?.alpha = opacity.coerceIn(0f, 1f)
  }

  fun hide() {
    val v = rootView ?: return
    try {
      windowManager.removeView(v)
    } catch (_: IllegalArgumentException) {
      // already removed
    }
    rootView = null
    scrollView = null
    textView = null
    layoutParams = null
  }

  // ---------------------------------------------------------------------------
  // Drag-to-move
  // ---------------------------------------------------------------------------

  private fun attachDragListener(view: View, params: WindowManager.LayoutParams) {
    var initialX = 0
    var initialY = 0
    var touchStartX = 0f
    var touchStartY = 0f

    view.setOnTouchListener { _, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          initialX = params.x
          initialY = params.y
          touchStartX = event.rawX
          touchStartY = event.rawY
          true
        }
        MotionEvent.ACTION_MOVE -> {
          params.x = initialX + (event.rawX - touchStartX).toInt()
          params.y = initialY + (event.rawY - touchStartY).toInt()
          try {
            windowManager.updateViewLayout(view, params)
          } catch (_: Exception) {
            // view possibly detached; ignore
          }
          true
        }
        else -> false
      }
    }
  }

  private fun applyAlpha(color: Int, alpha: Float): Int {
    val a = (alpha.coerceIn(0f, 1f) * 255).toInt()
    return Color.argb(a, Color.red(color), Color.green(color), Color.blue(color))
  }
}
