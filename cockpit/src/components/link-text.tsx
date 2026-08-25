import { Linking, Text, type TextProps } from "react-native";

/**
 * Renders text as a tappable link that opens the URL (e.g. exp:// deep links).
 */
export function LinkText({
  url,
  children,
  style,
}: {
  url: string;
  children: string;
  style?: TextProps["style"];
}) {
  return (
    <Text
      onPress={() => Linking.openURL(url).catch(() => {})}
      style={[style, { color: "#1a6fc4", textDecorationLine: "underline" }]}
    >
      {children}
    </Text>
  );
}
