import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

export const pickSource = async (setPhoto: (uri: string) => void) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    Toast.show({
      type: "error",
      text1: "Photo Permission Required",
      text2: "Allow photo library access to choose an incident image.",
    });
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.3,
  });

  if (!result.canceled) {
    setPhoto(result.assets[0].uri);
  }
};
