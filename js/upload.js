const B2 = require('backblaze-b2');
const fs = require('fs');
const multer = require('multer');

if (!process.env.B2_BUCKET_NAME || !process.env.B2_BUCKET_ID || !process.env.B2_KEY || !process.env.B2_KEY_ID) {
    throw Error("environment variables for b2 credentials not defined.");
}

// settings

const MAX_FILE_SIZE = 100 * (1000 * 1000) //100mb
const MAX_FILE_COUNT = 10;

//

exports.none = multer({ storage: multer.memoryStorage() }).none();

exports.uploadMulter = multer({
    storage: multer.diskStorage({
        destination: 'tmp',
        filename: (req, file, cb) => {
            cb(null, nanoid(16));
        }
    }),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILE_COUNT
    }
}).array('files');

exports.uploadB2 = async (file) => {
    const b2 = new B2({
        applicationKeyId: process.env.B2_KEY_ID,
        applicationKey: process.env.B2_KEY
    })
    const auth_response = await b2.authorize();
    const { downloadUrl } = auth_response.data;

    //

    const response = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID });
    const { authorizationToken, uploadUrl } = response.data;

    const file_info = await b2.uploadFile({
        uploadUrl,
        uploadAuthToken: authorizationToken,
        fileName: nanoid(8) + '-' + new Date().toLocaleDateString().replaceAll('/','-') + '-' + file.originalname.replace(/[()]/g,'-'),
        data: fs.readFileSync(file.path)
    });

    if (file_info.data?.fileName ?? null) {
        return `${downloadUrl}/file/${process.env.B2_BUCKET_NAME}/${file_info.data.fileName}`;
    }
    
    return;
}

// https://www.npmjs.com/package/nanoid
function nanoid(e=21) {
    let a="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
    let t = "", r = crypto.getRandomValues(new Uint8Array(e));
    for (let n=0; n<e; n++)
        t += a[63 & r[n]];
    return t;
};