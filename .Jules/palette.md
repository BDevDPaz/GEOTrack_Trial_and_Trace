## 2024-05-18 - Interactive Element Polish
**Learning:** For a more accessible application and better UX, especially on mobile devices where touch targets can be small, icon buttons and textual filter buttons should include `accessibilityRole="button"`, an appropriate `accessibilityLabel`, and an expanded touch area via `hitSlop`.
**Action:** Always verify small `Pressable` and `TouchableOpacity` elements (like close or lock icons) have these attributes to improve keyboard/screen-reader navigation and touch accuracy.
