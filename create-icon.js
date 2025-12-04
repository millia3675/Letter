const sharp = require('sharp');
const path = require('path');

// Close.png를 256x256 PNG로 리사이즈
const inputPath = path.join(__dirname, 'src', 'assets', 'Close.png');
const outputPath = path.join(__dirname, 'src', 'assets', 'icon.png');

sharp(inputPath)
  .resize(256, 256, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log('아이콘 PNG가 성공적으로 생성되었습니다:', outputPath);
  })
  .catch(err => {
    console.error('아이콘 생성 실패:', err);
  });
