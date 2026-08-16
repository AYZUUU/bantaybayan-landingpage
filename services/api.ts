const BASE_URL = "http://192.168.100.108/api";

export const sendReport = async (report: {
  emergency_type: string;
  accident_level: string;
  reporter_name: string;
  latitude: number;
  longitude: number;
  user_id?: number;
  image?: string | null;
}) => {
  const formData = new FormData();
  formData.append("accident_level", report.accident_level || "Urgent");
  formData.append("emergency_type", report.emergency_type);
  formData.append("reporter_name", report.reporter_name);
  formData.append("latitude", report.latitude.toString());
  formData.append("longitude", report.longitude.toString());

  if (report.user_id) {
    formData.append("user_id", report.user_id.toString());
  }

  if (report.image) {
    const filename = report.image.split("/").pop() || "photo.mov";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append("image", {
      uri: report.image,
      name: filename,
      type: type,
    } as any);
  }

  try {
    const res = await fetch(`${BASE_URL}/reports.php`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    const rawText = await res.text();
    console.log("🚨 RAW SERVER RESPONSE FROM PHP:", rawText);

    return JSON.parse(rawText);
  } catch (error) {
    console.error("sendReport Network or Parse Error:", error);
    throw error;
  }
};
