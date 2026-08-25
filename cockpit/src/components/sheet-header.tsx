import { Button, Host, Image } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

interface SheetHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Right-side action slot (e.g. a "Create" button). */
  right?: ReactNode;
  /** Overrides for the header row (padding/spacing when the parent already insets). */
  style?: StyleProp<ViewStyle>;
  closeTestID?: string;
}

/**
 * In-content header for iOS formSheet screens.
 *
 * The liquid-glass sheets have NO native header (react-native-screens formSheet
 * bugs #3092 / #4275 hide the content when a native header is used), so every
 * sheet screen renders this header itself: ✕ close (native SF Symbol), title/
 * subtitle, and an optional right-side action.
 */
export function SheetHeader({
  title,
  subtitle,
  onClose,
  right,
  style,
  closeTestID = "close-button",
}: SheetHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {/* Native SwiftUI close button (bordered xmark) wrapped in a Host. */}
      <Host style={styles.closeHost} matchContents>
        <Button
          onPress={onClose}
          testID={closeTestID}
          modifiers={[
            buttonStyle("bordered"),
            buttonBorderShape("circle"),
            controlSize("regular"),
            frame({ width: 36, height: 36 }),
            tint("#1C1C1E"),
            accessibilityLabel("Close"),
          ]}
        >
          <Image systemName="xmark" size={15} />
        </Button>
      </Host>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    // Keep the header above the scroll content: never shrink it and paint it
    // on top — a formSheet ScrollView can otherwise be laid out over the header
    // (react-native-screens Fabric quirk).
    flexShrink: 0,
    zIndex: 1,
  },
  closeHost: {
    // Wraps the native SwiftUI button tightly (matchContents) so it stays
    // within the header's content padding and never overflows the row.
    alignSelf: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: "#111" },
  subtitle: { marginTop: 2, fontSize: 13, color: "#6B7280" },
});