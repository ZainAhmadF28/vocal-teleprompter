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

class TeleprompterOverlayModule : Module() {

  private val mainHandler by lazy { Handler(Looper.getMainLooper()) }

  private val overlayManager by lazy {
    OverlayManager(appContext.reactContext ?: throw IllegalStateException("No context"))
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoTeleprompterOverlay")

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
      val text = config["text"] as? String ?: ""
      val fontSize = (config["fontSize"] as? Number)?.toFloat() ?: 18f
      val fontColor = parseColor(config["fontColor"] as? String, Color.WHITE)
      val backgroundColor = parseColor(config["backgroundColor"] as? String, Color.BLACK)
      val opacity = (config["opacity"] as? Number)?.toFloat() ?: 0.85f
      val posX = (config["x"] as? Number)?.toInt() ?: 100
      val posY = (config["y"] as? Number)?.toInt() ?: 200
      val width = (config["width"] as? Number)?.toInt() ?: 800
      val height = (config["height"] as? Number)?.toInt() ?: 400

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
          height = height
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
}
