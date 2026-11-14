import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

export const pickSource = async (setPhoto: (uri: string) => void) => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    Toast.show({
      type: "error",
      text1: "Camera Permission Required",
      text2: "Allow camera access to take an incident photo.",
    });
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
