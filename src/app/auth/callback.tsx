import { Redirect } from "expo-router";

export default function OAuthCallback() {
  // The provider owns token exchange. This route must never become a visible
  // second authentication screen when Android delivers the deep link.
  return <Redirect href="/(tabs)/profile" />;
}
