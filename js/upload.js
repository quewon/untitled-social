require('dotenv').config();

const B2 = require('backblaze-b2');
const multer = require('multer');

// settings

const max_file_size = 10 * (1000 * 1000) //10mb

//

exports.none = multer({ storage: multer.memoryStorage() }).none();

exports.uploadMulter = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: max_file_size
    }
}).single('file');

exports.uploadB2 = async (req, res, next) => {
    const b2 = new B2({
        applicationKeyId: process.env.KEY_ID,
        applicationKey: process.env.KEY
    });

    const auth_response = await b2.authorize();
    const { downloadUrl } = auth_response.data;

    const response = await b2.getUploadUrl({ bucketId: process.env.BUCKET_ID });
    const { authorizationToken, uploadUrl } = response.data;

    const file_info = await b2.uploadFile({
        uploadUrl,
        uploadAuthToken: authorizationToken,
        fileName: nanoid(8) + '-' + new Date().toLocaleDateString().replaceAll('/','-') + '-' + req.file.originalname,
        data: req.file.buffer
    });
    
    res.locals.url = `${downloadUrl}/file/${process.env.BUCKET_NAME}/${file_info.data.fileName}`;

    next();
}

// https://www.npmjs.com/package/nanoid
let a="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function nanoid(e=21) {
    let t = "", r = crypto.getRandomValues(new Uint8Array(e));
    for (let n=0; n<e; n++)
        t += a[63 & r[n]];
    return t;
};