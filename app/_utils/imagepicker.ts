import * as ImagePicker from "expo-image-picker";

export const pickSource = async (setPhoto: (uri: string) => void) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    alert("Sorry, we need camera roll permissions to make this work!");
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
