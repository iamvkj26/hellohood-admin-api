const crypto = require("crypto");
require("dotenv").config();

const encodeId = (id) => {
    const secretId = process.env.ID_HASH_SECRET;
    if (!secretId) throw new Error("ID_SECRET environment variable is not set");
    return crypto.createHmac("sha256", secretId).update(String(id)).digest("hex");
};

module.exports = { encodeId };