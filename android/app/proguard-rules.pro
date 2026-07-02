# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native core — keep all JNI-accessible classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo modules use reflection to discover and instantiate modules
-keep class expo.modules.** { *; }
-keep @expo.modules.core.interfaces.DoNotStrip class * { *; }
-keepclassmembers class * {
    @expo.modules.core.interfaces.DoNotStrip *;
}

# expo-sqlite / Drizzle use SQLite JNI
-keep class io.expo.sqlite.** { *; }

# expo-notifications
-keep class expo.modules.notifications.** { *; }

# expo-camera / ML Kit
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.vision.** { *; }

# Hermes JS engine
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# OkHttp (used internally by React Native network layer)
-dontwarn okhttp3.**
-dontwarn okio.**

# Add any project specific keep options here:
