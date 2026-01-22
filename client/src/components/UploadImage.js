import React, { useState } from "react";
import { Grid, Button } from "@mui/material";
import ImageIcon from '@mui/icons-material/Image';

const [previewUrl, setPreviewUrl] = useState(null);
const [file, setFile] = useState(null);

const handleImageChange = (e) => {
    console.log("Upload Image");
    const file = e.target.files[0];

    if (file) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }

      console.log("Display image previews");
      const tempImgUrl = URL.createObjectURL(file);
      setPreviewUrl(tempImgUrl);
    };


    /* const handleImageUpload = async () => {
      if (!file) return console.log("No file selected");
    
      const formData = new FormData();
      formData.append("image", file);


      try {
        const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
       });

        // Set the processed image URL from Cloudinary/Server
        setUploadedImage(response.data.imageUrl); 
        console.log("Upload successful:", response.data.imageUrl);
      } catch (err) {
        console.error("Upload error:", err);
      } 
    }; */

    const removeImage = (e) => {
      console.log("Remove Image");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    };

const UploadImage = () => {
    return (
    <React.Fragment>
        <Grid item>
            <ImageIcon style={{ fontSize: 400 }} />
        </Grid>
        <Grid item gap={2}>
            <Grid container direction="row" gap={2} justifyContent="center">
                <Button
                color="primary"
                variant="contained"
                //onClick={() => handleImageChange()}
                >
                Upload
                    <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={thishandleImageChange}
                    />
                </Button>
                <Button
                color="error"
                variant="contained"
                onClick={() => removeImage()}
                >
                Remove
                </Button>
            </Grid>
        </Grid>
    </React.Fragment>
    );
};

export default UploadImage;