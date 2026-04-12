const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: "dpgf8pzuo",
    api_key: "385877743365342",
    api_secret: "JtqBAwRyAxzuD379sH5PR1NM8vM"
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'electronics-app',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1200, quality: 'auto', fetch_format: 'auto' }]
    }
});

const upload = multer({ storage });

module.exports = { cloudinary, upload };
