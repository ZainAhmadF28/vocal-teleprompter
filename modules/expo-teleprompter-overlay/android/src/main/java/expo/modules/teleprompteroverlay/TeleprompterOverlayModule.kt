package expo.modules.teleprompteroverlay

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.roundToInt

class TeleprompterOverlayModule : Module() {

  private val mainHandler by lazy { Handler(Looper.getMainLooper()) }

  private val overlayManager by lazy {
    OverlayManager(
      appContext.reactContext ?: throw IllegalStateException("No context"),
      onControlPressed = { action ->
        sendEvent("controlPressed", mapOf("action" to action))
      },
      onPositionChanged = { x, y ->
        sendEvent("positionChanged", mapOf("x" to x, "y" to y))
      },
      onSizeChanged = { width, height ->
        sendEvent("sizeChanged", mapOf("width" to width, "height" to height))
      }
    )
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoTeleprompterOverlay")

    Events(
      "controlPressed",
      "positionChanged",
      "sizeChanged"
    )

    AsyncFunction("hasPermission") { ->
      val ctx = appContext.reactContext ?: return@AsyncFunction false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(ctx)
      } else {
        true
      }
    }

    AsyncFunction("requestPermission") { ->
      val ctx = appContext.reactContext ?: return@AsyncFunction false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        if (!Settings.canDrawOverlays(ctx)) {
          val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${ctx.packageName}")
          ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          try {
            ctx.startActivity(intent)
          } catch (_: Exception) {
            return@AsyncFunction false
          }
        }
        Settings.canDrawOverlays(ctx)
      } else {
        true
      }
    }

    AsyncFunction("show") { config: Map<String, Any?> ->
      val ctx = appContext.reactContext ?: return@AsyncFunction
      val text = config["text"] as? String ?: ""
      val fontSize = (config["fontSize"] as? Number)?.toFloat() ?: 18f
      val fontColor = parseColor(config["fontColor"] as? String, Color.WHITE)
      val backgroundColor = parseColor(config["backgroundColor"] as? String, Color.BLACK)
      val opacity = (config["opacity"] as? Number)?.toFloat() ?: 0.85f
      val density = ctx.resources.displayMetrics.density
      val posX = dpToPx((config["x"] as? Number)?.toFloat() ?: 100f, density)
      val posY = dpToPx((config["y"] as? Number)?.toFloat() ?: 200f, density)
      val width = dpToPx((config["width"] as? Number)?.toFloat() ?: 420f, density)
      val height = dpToPx((config["height"] as? Number)?.toFloat() ?: 300f, density)
      val scrollMode = config["scrollMode"] as? String ?: "voice"
      val isPaused = config["isPaused"] as? Boolean ?: false
      val speedLabel = config["speedLabel"] as? String ?: "140"

      mainHandler.post {
        overlayManager.show(
          text = text,
          fontSize = fontSize,
          fontColor = fontColor,
          backgroundColor = backgroundColor,
          opacity = opacity,
          posX = posX,
          posY = posY,
          width = width,
          height = height,
          initialScrollMode = scrollMode,
          initialPaused = isPaused,
          initialSpeedLabel = speedLabel
        )
      }
    }

    Function("hide") {
      mainHandler.post { overlayManager.hide() }
    }

    Function("setText") { text: String ->
      mainHandler.post { overlayManager.setText(text) }
    }

    Function("setScrollPosition") { y: Double ->
      mainHandler.post { overlayManager.setScrollPosition(y.toFloat()) }
    }

    Function("setCurrentWordIndex") { index: Int ->
      mainHandler.post { overlayManager.setCurrentWordIndex(index) }
    }

    Function("setPaused") { paused: Boolean ->
      mainHandler.post { overlayManager.setPaused(paused) }
    }

    Function("setScrollMode") { mode: String ->
      mainHandler.post { overlayManager.setScrollMode(mode) }
    }

    Function("setSpeedLabel") { label: String ->
      mainHandler.post { overlayManager.setSpeedLabel(label) }
    }

    Function("setOpacity") { opacity: Double ->
      mainHandler.post { overlayManager.setOpacity(opacity.toFloat()) }
    }

    AsyncFunction("isShown") { ->
      overlayManager.isShown()
    }

    OnDestroy {
      mainHandler.post { overlayManager.hide() }
    }
  }

  private fun parseColor(hex: String?, fallback: Int): Int {
    if (hex.isNullOrEmpty()) return fallback
    return try {
      Color.parseColor(hex)
    } catch (_: Exception) {
      fallback
    }
  }

  private fun dpToPx(dp: Float, density: Float): Int {
    return (dp * density).roundToInt()
  }
}
