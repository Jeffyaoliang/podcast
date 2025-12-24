const fs = require('fs');
const path = require('path');

// 读取Markdown文件
const mdPath = 'M2.1评测文章_多语言方向_完整版_2025版.md';
const docxPath = 'M2.1评测文章_多语言方向_完整版_2025版.docx';

console.log('📖 读取Markdown文件...');
const content = fs.readFileSync(mdPath, 'utf8');
const lines = content.split('\n');
console.log(`✅ 读取完成，共 ${lines.length} 行`);

// 创建一个简单的RTF格式文档（可以直接用Word打开）
// RTF格式虽然简单，但可以被Word正确识别

let rtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}{\\colortbl;\\red0\\green0\\blue0;}{\\*\generator Node.js RTF Generator;}
\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440
\\f0\\fs24`;

let inCodeBlock = false;

// 遍历每一行
lines.forEach((line, index) => {
    line = line.trim();
    
    // 跳过空行
    if (!line) {
        rtfContent += '\\par\\par ';
        return;
    }
    
    // 跳过代码块
    if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return;
    }
    
    if (inCodeBlock) {
        rtfContent += `\\par ${line.replace(/[{}]/g, '')} `;
        return;
    }
    
    // 主标题
    if (line.startsWith('# M2.1评测文章')) {
        rtfContent += `\\par\\par\\qc\\fs36\\b ${line.replace('# ', '')} \\b0\\fs24\\qc\\par\\par `;
    }
    // 一级标题
    else if (line.startsWith('# ') && !line.startsWith('##')) {
        rtfContent += `\\par\\par\\fs28\\b ${line.replace('# ', '')} \\b0\\fs24\\par `;
    }
    // 二级标题
    else if (line.startsWith('## ')) {
        rtfContent += `\\par\\par\\fs26\\b ${line.replace('## ', '')} \\b0\\fs24\\par `;
    }
    // 三级标题
    else if (line.startsWith('### ')) {
        rtfContent += `\\par\\par\\fs24\\b ${line.replace('### ', '')} \\b0\\fs24\\par `;
    }
    // 列表项
    else if (line.startsWith('- ')) {
        rtfContent += `\\par\\bullet ${line.substring(2)} `;
    }
    // 普通段落 - 清理markdown格式
    else {
        let text = line;
        text = text.replace(/\\*\\*(.+?)\\*\\*/g, '$1'); // 粗体
        text = text.replace(/\\*(.+?)\\*/g, '$1'); // 斜体
        text = text.replace(/`(.+?)`/g, '$1'); // 行内代码
        text = text.replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, '$1'); // 链接
        text = text.replace(/</g, '<').replace(/>/g, '>'); // HTML实体
        
        rtfContent += `\\par ${text} `;
    }
});

rtfContent += '\\par }';

// 保存文件
fs.writeFileSync(docxPath, rtfContent, 'utf8');

console.log('✅ RTF文档已创建！');
console.log(`📄 文件路径: ${path.resolve(docxPath)}`);
console.log(`📊 文件大小: ${fs.statSync(docxPath).size} bytes`);
console.log('');
console.log('⚠️ 注意：这是一个RTF格式文件，可以用Word直接打开。');
console.log('   如果需要真正的DOCX格式，请用Word打开后另存为DOCX。');

