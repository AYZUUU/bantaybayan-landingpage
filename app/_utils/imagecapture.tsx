import * as ImagePicker from "expo-image-picker";

export const pickSource = async (setPhoto: (uri: string) => void) => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    alert("Camera permission is required!");
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 1,
  });

  if (!result.canceled) {
    setPhoto(result.assets[0].uri);
  }
};
