export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { requestPermissionsAsync } = await import('expo-notifications');
    const { status } = await requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { requestCameraPermissionsAsync } = await import('expo-image-picker');
    const { status } = await requestCameraPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
