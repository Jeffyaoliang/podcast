const docx = require('docx');
const fs = require('fs');
const path = require('path');

const { Document, Packer, Paragraph, HeadingLevel, TextRun } = docx;

async function createWordDocument() {
    console.log('开始生成 M2.1评测文章 Word 文档...');
    
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: 'M2.1评测：多语言能力突破',
                    heading: HeadingLevel.TITLE,
                    alignment: 'center'
                }),
                new Paragraph({
                    text: 'AI编程助手能否真正全球化',
                    alignment: 'center'
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '作者：AI Tech Review',
                            size: 24
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '日期：2025年12月23日',
                            size: 24
                        })
                    ]
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '在AI编程助手的战场上，我们正在见证一个微妙却关键的转折点。当GitHub Copilot、Cursor等工具在主流编程语言上已经达到相当成熟度时，一个深层次的问题浮现：AI编程助手的价值边界在哪里？它们能否真正打破语言和地域的壁垒，成为全球开发者的通用工具？'
                        })
                    ]
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    text: '一、Case 1: Go语言后端服务开发',
                    heading: HeadingLevel.HEADING_1
                }),
                new Paragraph({
                    text: '场景描述：开发一个完整的播客应用后端服务，需要实现用户认证（JWT）、RSS解析、音频代理等功能。'
                }),
                new Paragraph({
                    text: '项目需求：使用Go语言开发一个RESTful API服务，使用Gin框架，实现播客数据获取、用户登录认证、音频流代理等功能。'
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    text: '二、Case 2: Swift iOS原生应用开发',
                    heading: HeadingLevel.HEADING_1
                }),
                new Paragraph({
                    text: '场景描述：开发一个原生iOS播客客户端，使用SwiftUI构建用户界面，集成网络请求、数据展示、音频播放等功能。'
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    text: '三、Case 3: Kotlin Android原生应用开发',
                    heading: HeadingLevel.HEADING_1
                }),
                new Paragraph({
                    text: '场景描述：开发一个原生Android播客客户端，使用Jetpack Compose构建声明式UI，实现网络请求、数据展示、用户交互等功能。'
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    text: '四、Case 4: TypeScript现代Web前端开发',
                    heading: HeadingLevel.HEADING_1
                }),
                new Paragraph({
                    text: '场景描述：开发一个现代化的播客Web应用，使用React + Vite构建，集成状态管理、路由导航、API调用等功能。'
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    text: '五、Case 5: 多语言混合开发实践',
                    heading: HeadingLevel.HEADING_1
                }),
                new Paragraph({
                    text: '场景描述：在一个完整的播客平台项目中同时使用Go、TypeScript、Swift、Kotlin四种语言，通过标准化的API进行跨平台数据交换。'
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    text: '六、实战应用：DreamEcho播客项目',
                    heading: HeadingLevel.HEADING_1
                }),
                new Paragraph({
                    text: '基于M2.1构建的完整多语言播客平台，包含后端、iOS、Android、Web四个端。'
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    text: '七、结语',
                    heading: HeadingLevel.HEADING_1
                }),
                new Paragraph({
                    text: 'M2.1的多语言优化为开发者提供了真正的全球化支持。当AI编程助手能够用你熟悉的语言、写你熟悉的代码风格、理解你的开发习惯时，"全球化"才真正开始。'
                }),
                new Paragraph({
                    text: ''
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '项目地址：https://github.com/Jeffyaoliang/podcast'
                        })
                    ]
                })
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = 'E:/hack/M2.1评测文章_2025版.docx';
    fs.writeFileSync(outputPath, buffer);
    
    console.log('✅ 成功创建 Word 文档！');
    console.log('📄 文件路径：' + outputPath);
    console.log('📊 文件大小：' + buffer.length + ' bytes');
}

createWordDocument().catch(console.error);

