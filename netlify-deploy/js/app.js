// 主应用逻辑
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupFileUploads();
    setupCategories();
    setupTemplates();
}

// 文件上传处理
function setupFileUploads() {
    // 商品白底图
    document.getElementById('product-image').addEventListener('change', function(e) {
        handleFileUpload(e, 'product-preview', (file) => {
            userData.productImage = file;
        });
    });
    
    // 产品说明书
    document.getElementById('manual').addEventListener('change', function(e) {
        handleMultiFormatUpload(e, 'manual-preview', 'manual-content', (files) => {
            userData.manuals = Array.from(files);
        });
    });
    
    // 工厂信息
    document.getElementById('factory-info').addEventListener('change', function(e) {
        handleMultiFormatUpload(e, 'factory-preview', 'factory-content', (files) => {
            userData.factoryInfo = Array.from(files);
        });
    });
}

function handleFileUpload(event, previewId, callback, multiple = false) {
    const files = event.target.files;
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    
    if (files.length === 0) return;
    
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });
    
    callback(multiple ? files : files[0]);
}

// 品类设置
function setupCategories() {
    const categories = [
        { id: 'office', name: '办公、文体' },
        { id: 'shoes', name: '鞋' },
        { id: 'outerwear', name: '外套' },
        { id: 'underwear', name: '内衣' },
        { id: 'clothing-accessories', name: '服饰配件、饰品' },
        { id: 'furniture', name: '家具' },
        { id: 'womens-wear', name: '女装' },
        { id: 'food-drink', name: '食品酒水' },
        { id: 'pet-garden', name: '宠物园艺' },
        { id: 'childrens-wear', name: '童装童鞋' },
        { id: 'lighting', name: '灯饰照明' },
        { id: 'mens-wear', name: '男装' },
        { id: 'electronic-components', name: '电子元器件' },
        { id: 'transmission', name: '传输、线缆' },
        { id: 'security', name: '安全、防护' },
        { id: 'packaging', name: '包装' },
        { id: 'battery', name: '电源、电脑' },
        { id: 'electrical', name: '电工电器' },
        { id: 'textile', name: '纺织皮革' },
        { id: 'bags-leather', name: '箱包皮具' },
        { id: 'machinery', name: '机械行业设备' },
        { id: 'hardware', name: '五金、工具' },
        { id: 'chemical', name: '化工' },
        { id: 'building-materials', name: '建材' },
        { id: 'environmental', name: '环保' },
        { id: 'sports-clothing', name: '运动衣' },
        { id: 'home-daily', name: '居家日用品' },
        { id: 'home-kitchen', name: '日用家厨具' },
        { id: 'home-textiles', name: '家用纺织' },
        { id: 'home-decoration', name: '家装家饰' },
        { id: 'beauty-care', name: '美容护肤/彩妆' },
        { id: 'household-appliances', name: '家用电器' },
        { id: 'health-building', name: '健康建材' },
        { id: 'transportation', name: '交通运输' },
        { id: 'energy', name: '能源' },
        { id: 'agriculture', name: '农业' },
        { id: 'auto-parts', name: '汽摩及配件' },
        { id: 'communication', name: '通信产品' },
        { id: 'jewelry', name: '珠宝首饰' },
        { id: 'medical', name: '医药、保养' },
        { id: 'printing', name: '印刷' },
        { id: 'sports-outdoor', name: '运动户外' },
        { id: 'toys-hobbies', name: '玩具及爱好' },
        { id: 'business-services', name: '商务服务' },
        { id: 'digital-accessories', name: '二手数码配件' },
        { id: 'gifts', name: '礼品' },
        { id: 'home-appliances', name: '个护/家清' },
        { id: 'adult-products', name: '成人用品' },
        { id: 'books-media', name: '图书音像' },
        { id: 'steel', name: '钢铁' },
        { id: 'new-energy', name: '新能源' }
    ];
    
    const container = document.getElementById('category-list');
    const searchInput = document.getElementById('category-search');
    
    // 渲染所有品类
    function renderCategories(filteredCategories) {
        container.innerHTML = '';
        filteredCategories.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerHTML = `<div>${cat.name}</div>`;
            div.onclick = () => selectCategory(cat.id, cat.name, div);
            container.appendChild(div);
        });
    }
    
    // 初始渲染
    renderCategories(categories);
    
    // 搜索功能
    searchInput.addEventListener('input', function(e) {
        const keyword = e.target.value.toLowerCase().trim();
        const filtered = categories.filter(cat => 
            cat.name.toLowerCase().includes(keyword)
        );
        renderCategories(filtered);
    });
}

function selectCategory(categoryId, categoryName, element) {
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    userData.category = categoryId;
    userData.categoryName = categoryName;
}

// 模板设置
function setupTemplates() {
    const templates = [
        { id: 'modern', name: '现代简约', style: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { id: 'luxury', name: '高端奢华', style: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        { id: 'fresh', name: '清新自然', style: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
        { id: 'tech', name: '科技感', style: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
        { id: 'warm', name: '温馨风格', style: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
        { id: 'business', name: '商务专业', style: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }
    ];
    
    const container = document.getElementById('template-list');
    templates.forEach(tpl => {
        const div = document.createElement('div');
        div.className = 'template-item';
        div.innerHTML = `
            <div style="width: 100%; height: 150px; background: ${tpl.style}; border-radius: 4px; margin-bottom: 10px;"></div>
            <div>${tpl.name}</div>
        `;
        div.onclick = () => selectTemplate(tpl.id, div);
        container.appendChild(div);
    });
}

function selectTemplate(templateId, element) {
    document.querySelectorAll('.template-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    userData.template = templateId;
}


// 处理多格式文件上传
function handleMultiFormatUpload(event, previewId, contentId, callback) {
    const files = event.target.files;
    const preview = document.getElementById(previewId);
    const contentDiv = document.getElementById(contentId);
    
    preview.innerHTML = '';
    contentDiv.innerHTML = '';
    contentDiv.classList.remove('active');
    
    if (files.length === 0) return;
    
    let hasContent = false;
    
    Array.from(files).forEach((file, index) => {
        // 图片预览
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
        
        // 读取文件内容
        readFileContent(file, contentDiv).then(() => {
            hasContent = true;
            contentDiv.classList.add('active');
        });
    });
    
    callback(files);
}

// 读取文件内容
async function readFileContent(file, container) {
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileType = getFileType(fileExt);
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'file-content-item';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'file-content-header';
    headerDiv.innerHTML = `
        <span class="file-name">📄 ${file.name}</span>
        <span class="file-type-badge ${fileType}">${fileExt.toUpperCase()}</span>
    `;
    itemDiv.appendChild(headerDiv);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'file-text-content';
    contentDiv.innerHTML = '<div class="file-loading">正在读取文件内容...</div>';
    itemDiv.appendChild(contentDiv);
    
    container.appendChild(itemDiv);
    
    try {
        let text = '';
        
        if (file.type.startsWith('image/')) {
            text = '图片文件已上传，可在上方预览';
        } else if (file.type === 'application/pdf' || fileExt === 'pdf') {
            text = await readPDF(file);
        } else if (fileExt === 'doc' || fileExt === 'docx') {
            text = await readWord(file);
        } else if (fileExt === 'xls' || fileExt === 'xlsx') {
            text = await readExcel(file);
        } else {
            text = await readTextFile(file);
        }
        
        contentDiv.innerHTML = text || '无法读取文件内容';
    } catch (error) {
        contentDiv.innerHTML = `<div class="file-error">读取失败: ${error.message}</div>`;
        console.error('文件读取错误:', error);
    }
}

// 获取文件类型
function getFileType(ext) {
    if (ext === 'pdf') return 'pdf';
    if (ext === 'doc' || ext === 'docx') return 'word';
    if (ext === 'xls' || ext === 'xlsx') return 'excel';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    return 'other';
}

// 读取PDF文件
async function readPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                
                for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += `\n--- 第${i}页 ---\n${pageText}\n`;
                }
                
                if (pdf.numPages > 10) {
                    fullText += `\n... (共${pdf.numPages}页，仅显示前10页)`;
                }
                
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// 读取Word文件
async function readWord(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                resolve(result.value || '文档内容为空');
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// 读取Excel文件
async function readExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                let fullText = '';
                
                workbook.SheetNames.forEach((sheetName, index) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    fullText += `\n=== 工作表: ${sheetName} ===\n`;
                    sheetData.slice(0, 20).forEach(row => {
                        fullText += row.join(' | ') + '\n';
                    });
                    
                    if (sheetData.length > 20) {
                        fullText += `... (共${sheetData.length}行，仅显示前20行)\n`;
                    }
                });
                
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// 读取纯文本文件
async function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
