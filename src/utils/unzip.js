/**
 * 极简 zip 解包（零依赖，用 Node 内置 zlib）。
 * 从中央目录读取条目大小（对带 data descriptor 的 zip 也稳），
 * 支持 stored(0) 与 deflate(8) 两种压缩方式——覆盖标准 `zip` 命令的输出。
 *
 * unzip(buffer) → { '文件名': Buffer, ... }
 */
const zlib = require('zlib');

function unzip(buf) {
  const files = {};
  // 1. 从尾部找 End of Central Directory (EOCD) 签名 0x06054b50
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('不是有效的 zip 文件');

  const cdCount = buf.readUInt16LE(eocd + 10);
  let cd = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < cdCount; n++) {
    if (buf.readUInt32LE(cd) !== 0x02014b50) break;            // 中央目录头签名
    const method = buf.readUInt16LE(cd + 10);
    const compSize = buf.readUInt32LE(cd + 20);
    const nameLen = buf.readUInt16LE(cd + 28);
    const extraLen = buf.readUInt16LE(cd + 30);
    const commentLen = buf.readUInt16LE(cd + 32);
    const localOff = buf.readUInt32LE(cd + 42);
    const name = buf.toString('utf8', cd + 46, cd + 46 + nameLen);

    if (buf.readUInt32LE(localOff) === 0x04034b50) {           // 本地文件头签名
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compSize);
      let content;
      if (method === 0) content = Buffer.from(data);           // 未压缩
      else if (method === 8) content = zlib.inflateRawSync(data); // deflate
      else throw new Error('不支持的压缩方式: ' + method);
      if (!name.endsWith('/')) files[name] = content;          // 跳过目录项
    }
    cd += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

module.exports = { unzip };
