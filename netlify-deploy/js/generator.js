// 详情页生成逻辑
function generateDetailPages() {
    const carouselCount = Math.floor(Math.random() * 4) + 5; // 5-8张
    const detailCount = Math.floor(Math.random() * 4) + 10; // 10-13张
    
    generateCarousel(carouselCount);
    generateDetails(detailCount);
}

function generateCarousel(count) {
    const container = document.getElementById('carousel-output');
    container.innerHTML = '';
    
    const carouselTypes = [
        '主图展示',
        '细节特写',
        '使用场景',
        '尺寸规格',
        '品质保证',
        '品牌故事',
        '促销信息',
        '服务承诺'
    ];
    
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'output-image';
        div.draggable = true;
        div.dataset.index = i;
        div.innerHTML = `
            <input type="checkbox" class="image-checkbox" onclick="toggleImageSelection(this, 'carousel-output')">
            <div class="image-number">${i + 1}</div>
            <button class="upload-reference-btn" onclick="uploadReference(this)" title="上传参照图">+</button>
            <input type="file" class="reference-input" accept="image/*" style="display: none;" onchange="handleReferenceUpload(this)">
            <div class="image-controls">
                <button class="move-btn regenerate-btn" onclick="regenerateImage(this, 'carousel-output')" title="重新生成">🔄</button>
                <button class="move-btn delete-btn" onclick="deleteImage(this, 'carousel-output')" title="删除">×</button>
            </div>
            <img class="main-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800'%3E%3Crect fill='%23${getCarouselColor(i)}' width='800' height='800'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dy='.3em'%3E轮播图${i+1}%3C/text%3E%3C/svg%3E" alt="轮播图${i+1}">
            <div class="image-label">${carouselTypes[i] || `轮播图${i+1}`}</div>
            <div class="image-text-input">
                <input type="text" class="text-input-field" placeholder="输入图片说明文字..." onchange="updateImageText(this)">
                <button class="text-edit-btn" onclick="toggleTextInput(this)" title="编辑文字">✏️</button>
            </div>
        `;
        container.appendChild(div);
    }
    
    setupDragAndDrop('carousel-output');
}

function generateDetails(count) {
    const container = document.getElementById('detail-output');
    container.innerHTML = '';
    
    const detailTypes = [
        '产品介绍',
        '核心卖点',
        '功能特性',
        '材质说明',
        '工艺展示',
        '尺寸参数',
        '使用方法',
        '场景应用',
        '品质认证',
        '工厂实力',
        '售后服务',
        '用户评价',
        '购买须知'
    ];
    
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'output-image';
        div.draggable = true;
        div.dataset.index = i;
        div.innerHTML = `
            <input type="checkbox" class="image-checkbox" onclick="toggleImageSelection(this, 'detail-output')">
            <div class="image-number">${i + 1}</div>
            <button class="upload-reference-btn" onclick="uploadReference(this)" title="上传参照图">+</button>
            <input type="file" class="reference-input" accept="image/*" style="display: none;" onchange="handleReferenceUpload(this)">
            <div class="image-controls">
                <button class="move-btn regenerate-btn" onclick="regenerateImage(this, 'detail-output')" title="重新生成">🔄</button>
                <button class="move-btn delete-btn" onclick="deleteImage(this, 'detail-output')" title="删除">×</button>
            </div>
            <img class="main-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='750' height='1000'%3E%3Crect fill='%23${getDetailColor(i)}' width='750' height='1000'/%3E%3Ctext x='50%25' y='50%25' font-size='36' fill='white' text-anchor='middle' dy='.3em'%3E详情页${i+1}%3C/text%3E%3C/svg%3E" alt="详情页${i+1}">
            <div class="image-label">${detailTypes[i] || `详情页${i+1}`}</div>
            <div class="image-text-input">
                <input type="text" class="text-input-field" placeholder="输入图片说明文字..." onchange="updateImageText(this)">
                <button class="text-edit-btn" onclick="toggleTextInput(this)" title="编辑文字">✏️</button>
            </div>
        `;
        container.appendChild(div);
    }
    
    setupDragAndDrop('detail-output');
}

// 优化的拖拽排序功能 - 支持360度拖拽
function setupDragAndDrop(containerId) {
    const container = document.getElementById(containerId);
    let draggedElement = null;
    
    const items = container.querySelectorAll('.output-image');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
    });
    
    function handleDragStart(e) {
        draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }
    
    function handleDragEnd(e) {
        this.classList.remove('dragging');
        
        const items = container.querySelectorAll('.output-image');
        items.forEach(item => {
            item.classList.remove('drag-over', 'drag-over-left', 'drag-over-right', 'drag-over-top', 'drag-over-bottom');
        });
        
        draggedElement = null;
        updateImageNumbers(containerId);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (this === draggedElement) {
            return false;
        }
        
        // 获取当前元素的位置信息
        const rect = this.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // 计算鼠标相对于元素的位置
        const relX = mouseX - rect.left;
        const relY = mouseY - rect.top;
        const width = rect.width;
        const height = rect.height;
        
        // 判断鼠标在元素的哪个区域（上下左右）
        const threshold = 0.5; // 50%的阈值
        
        // 计算到四个边的距离比例
        const distLeft = relX / width;
        const distRight = (width - relX) / width;
        const distTop = relY / height;
        const distBottom = (height - relY) / height;
        
        // 找出最近的边
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        
        if (minDist === distLeft && distLeft < threshold) {
            // 左侧
            this.parentNode.insertBefore(draggedElement, this);
        } else if (minDist === distRight && distRight < threshold) {
            // 右侧
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        } else if (minDist === distTop && distTop < threshold) {
            // 上方
            this.parentNode.insertBefore(draggedElement, this);
        } else if (minDist === distBottom && distBottom < threshold) {
            // 下方
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        } else {
            // 中心区域，根据鼠标位置判断
            if (relX < width / 2) {
                this.parentNode.insertBefore(draggedElement, this);
            } else {
                this.parentNode.insertBefore(draggedElement, this.nextSibling);
            }
        }
        
        return false;
    }
    
    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        this.classList.remove('drag-over');
        return false;
    }
    
    function handleDragEnter(e) {
        if (this !== draggedElement) {
            this.classList.add('drag-over');
        }
    }
    
    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }
}

function updateImageNumbers(containerId) {
    const container = document.getElementById(containerId);
    const images = container.querySelectorAll('.output-image');
    images.forEach((img, index) => {
        const numberDiv = img.querySelector('.image-number');
        if (numberDiv) {
            numberDiv.textContent = index + 1;
        }
    });
}

// 轮播图专用颜色 - 明亮鲜艳系列
const carouselColors = [
    'FF6B6B', // 珊瑚红
    '4ECDC4', // 青绿色
    'FFE66D', // 明黄色
    '95E1D3', // 薄荷绿
    'F38181', // 粉红色
    'AA96DA', // 淡紫色
    'FCBAD3', // 粉色
    'A8E6CF'  // 浅绿色
];

// 详情页专用颜色 - 深沉对比系列
const detailColors = [
    '5B84B1', // 钢蓝色
    'FC766A', // 橙红色
    '5F4B8B', // 深紫色
    'E69A8D', // 浅橙色
    '42EADD', // 青色
    'CDB599', // 米色
    'FF8C42', // 橙色
    '00B8A9', // 青绿色
    'F8B500', // 金黄色
    'E63946', // 深红色
    '457B9D', // 蓝灰色
    '06FFA5', // 荧光绿
    'DD5E89'  // 玫瑰色
];

function getCarouselColor(index) {
    return carouselColors[index % carouselColors.length];
}

function getDetailColor(index) {
    return detailColors[index % detailColors.length];
}

function downloadCarousel() {
    alert('轮播图下载功能：将所有轮播图打包为ZIP文件下载');
    // 实际项目中需要实现真实的下载逻辑
}

function downloadDetails() {
    alert('详情页下载功能：将所有详情页打包为ZIP文件下载');
    // 实际项目中需要实现真实的下载逻辑
}

// 使用按钮移动图片
function moveImage(button, direction, containerId) {
    const imageDiv = button.closest('.output-image');
    const container = document.getElementById(containerId);
    
    if (direction === 'up') {
        const prev = imageDiv.previousElementSibling;
        if (prev) {
            container.insertBefore(imageDiv, prev);
        }
    } else if (direction === 'down') {
        const next = imageDiv.nextElementSibling;
        if (next) {
            container.insertBefore(next, imageDiv);
        }
    }
    
    updateImageNumbers(containerId);
}


// 删除单个图片
function deleteImage(button, containerId) {
    if (confirm('确定要删除这张图片吗？')) {
        const imageDiv = button.closest('.output-image');
        imageDiv.remove();
        updateImageNumbers(containerId);
    }
}

// 切换图片选择状态
function toggleImageSelection(checkbox, containerId) {
    const imageDiv = checkbox.closest('.output-image');
    if (checkbox.checked) {
        imageDiv.classList.add('selected');
    } else {
        imageDiv.classList.remove('selected');
    }
    updateDeleteButtons(containerId);
}

// 全选/取消全选
function toggleSelectAll(containerId) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('.image-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        toggleImageSelection(cb, containerId);
    });
}

// 删除选中的图片
function deleteSelected(containerId) {
    const container = document.getElementById(containerId);
    const selected = container.querySelectorAll('.output-image.selected');
    
    if (selected.length === 0) {
        alert('请先选择要删除的图片');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${selected.length} 张图片吗？`)) {
        selected.forEach(img => img.remove());
        updateImageNumbers(containerId);
        updateDeleteButtons(containerId);
    }
}

// 更新删除按钮状态
function updateDeleteButtons(containerId) {
    const container = document.getElementById(containerId);
    const selectedCount = container.querySelectorAll('.output-image.selected').length;
    const deleteBtn = document.getElementById(`delete-selected-${containerId}`);
    
    if (deleteBtn) {
        if (selectedCount > 0) {
            deleteBtn.textContent = `🗑️ 删除选中 (${selectedCount})`;
            deleteBtn.style.display = 'inline-block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }
}


// 上传参照图
function uploadReference(button) {
    const imageDiv = button.closest('.output-image');
    const fileInput = imageDiv.querySelector('.reference-input');
    fileInput.click();
}

// 处理参照图上传
function handleReferenceUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
    }
    
    const imageDiv = input.closest('.output-image');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // 检查是否已有参照图
        let referenceContainer = imageDiv.querySelector('.reference-image-container');
        
        if (!referenceContainer) {
            // 创建参照图容器
            referenceContainer = document.createElement('div');
            referenceContainer.className = 'reference-image-container';
            
            const referenceImg = document.createElement('img');
            referenceImg.className = 'reference-image';
            referenceImg.src = e.target.result;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-reference-btn';
            removeBtn.innerHTML = '×';
            removeBtn.title = '移除参照图';
            removeBtn.onclick = function() {
                removeReference(this);
            };
            
            const label = document.createElement('div');
            label.className = 'reference-label';
            label.textContent = '参照图';
            
            referenceContainer.appendChild(referenceImg);
            referenceContainer.appendChild(removeBtn);
            referenceContainer.appendChild(label);
            
            // 插入到主图之前
            const mainImage = imageDiv.querySelector('.main-image');
            imageDiv.insertBefore(referenceContainer, mainImage);
        } else {
            // 更新现有参照图
            const referenceImg = referenceContainer.querySelector('.reference-image');
            referenceImg.src = e.target.result;
        }
        
        // 更新上传按钮状态
        const uploadBtn = imageDiv.querySelector('.upload-reference-btn');
        uploadBtn.classList.add('has-reference');
        uploadBtn.textContent = '✓';
        uploadBtn.title = '已上传参照图，点击更换';
    };
    
    reader.readAsDataURL(file);
}

// 移除参照图
function removeReference(button) {
    const imageDiv = button.closest('.output-image');
    const referenceContainer = button.closest('.reference-image-container');
    
    if (confirm('确定要移除参照图吗？')) {
        referenceContainer.remove();
        
        // 重置上传按钮
        const uploadBtn = imageDiv.querySelector('.upload-reference-btn');
        uploadBtn.classList.remove('has-reference');
        uploadBtn.textContent = '+';
        uploadBtn.title = '上传参照图';
        
        // 清空文件输入
        const fileInput = imageDiv.querySelector('.reference-input');
        fileInput.value = '';
    }
}


// 切换文本输入框显示
function toggleTextInput(button) {
    const imageDiv = button.closest('.output-image');
    const inputContainer = button.closest('.image-text-input');
    const inputField = inputContainer.querySelector('.text-input-field');
    
    // 聚焦输入框
    inputField.focus();
    inputField.select();
}

// 更新图片文本
function updateImageText(input) {
    const text = input.value.trim();
    const imageDiv = input.closest('.output-image');
    const inputContainer = input.closest('.image-text-input');
    
    // 移除旧的显示标签
    const oldDisplay = imageDiv.querySelector('.image-text-display');
    if (oldDisplay) {
        oldDisplay.remove();
    }
    
    if (text) {
        // 添加has-value类
        input.classList.add('has-value');
        inputContainer.classList.add('has-text');
        
        // 创建文本显示标签
        const textDisplay = document.createElement('div');
        textDisplay.className = 'image-text-display';
        textDisplay.textContent = text;
        textDisplay.onclick = function() {
            // 点击文本可以重新编辑
            input.focus();
            input.select();
        };
        
        // 插入到输入框之前
        imageDiv.insertBefore(textDisplay, inputContainer);
    } else {
        // 移除has-value类
        input.classList.remove('has-value');
        inputContainer.classList.remove('has-text');
    }
}

// 为输入框添加实时更新
document.addEventListener('DOMContentLoaded', function() {
    // 使用事件委托处理动态添加的输入框
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('text-input-field')) {
            const text = e.target.value.trim();
            if (text) {
                e.target.classList.add('has-value');
                e.target.closest('.image-text-input').classList.add('has-text');
            } else {
                e.target.classList.remove('has-value');
                e.target.closest('.image-text-input').classList.remove('has-text');
            }
        }
    });
});


// 预览合并长图
let currentMergedCanvas = null;
let currentContainerId = null;
let carouselImages = [];
let currentCarouselIndex = 0;

function previewMergedImage(containerId) {
    currentContainerId = containerId;
    const container = document.getElementById(containerId);
    const images = container.querySelectorAll('.output-image');
    
    if (images.length === 0) {
        alert('没有图片可以预览');
        return;
    }
    
    // 显示弹窗
    const modal = document.getElementById('preview-modal');
    modal.classList.add('active');
    
    // 设置标题
    const title = containerId === 'carousel-output' ? '轮播图预览' : '详情页长图预览';
    document.getElementById('preview-title').textContent = title;
    
    // 根据类型选择不同的预览模式
    if (containerId === 'carousel-output') {
        // 轮播图：左右滑动模式
        showCarouselPreview(container);
    } else {
        // 详情页：长图模式
        document.getElementById('preview-loading').style.display = 'block';
        document.getElementById('preview-canvas').style.display = 'none';
        document.getElementById('carousel-preview').style.display = 'none';
        
        setTimeout(() => {
            mergeImages(containerId);
        }, 100);
    }
}

// 轮播图预览模式
function showCarouselPreview(container) {
    const images = container.querySelectorAll('.output-image .main-image');
    carouselImages = Array.from(images);
    currentCarouselIndex = 0;
    
    // 隐藏长图预览，显示轮播预览
    document.getElementById('preview-loading').style.display = 'none';
    document.getElementById('preview-canvas').style.display = 'none';
    const carouselPreview = document.getElementById('carousel-preview');
    carouselPreview.style.display = 'flex';
    
    // 更新预览
    updateCarouselPreview();
    
    // 更新下载按钮文字
    const downloadBtn = document.querySelector('.btn-download-merged');
    downloadBtn.textContent = '💾 下载当前图片';
}

// 合并图片
function mergeImages(containerId) {
    const container = document.getElementById(containerId);
    const images = container.querySelectorAll('.output-image .main-image');
    
    if (images.length === 0) {
        alert('没有图片可以合并');
        closePreview();
        return;
    }
    
    // 创建canvas
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    
    // 获取第一张图片的宽度作为画布宽度
    const firstImg = images[0];
    const imgWidth = containerId === 'carousel-output' ? 800 : 750;
    const imgHeight = containerId === 'carousel-output' ? 800 : 1000;
    
    // 设置画布尺寸
    canvas.width = imgWidth;
    canvas.height = imgHeight * images.length;
    
    // 加载所有图片并绘制
    let loadedCount = 0;
    const imgElements = [];
    
    images.forEach((imgElement, index) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            imgElements[index] = img;
            loadedCount++;
            
            // 所有图片加载完成后绘制
            if (loadedCount === images.length) {
                drawMergedImage(ctx, imgElements, imgWidth, imgHeight);
            }
        };
        img.onerror = function() {
            console.error('图片加载失败:', index);
            loadedCount++;
            if (loadedCount === images.length) {
                drawMergedImage(ctx, imgElements, imgWidth, imgHeight);
            }
        };
        img.src = imgElement.src;
    });
}

// 绘制合并图片
function drawMergedImage(ctx, images, width, height) {
    // 清空画布
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 依次绘制每张图片，从上到下，无间隙
    images.forEach((img, index) => {
        if (img) {
            const y = index * height;
            ctx.drawImage(img, 0, y, width, height);
        }
    });
    
    // 保存当前canvas
    currentMergedCanvas = ctx.canvas;
    
    // 隐藏加载状态，显示canvas
    document.getElementById('preview-loading').style.display = 'none';
    document.getElementById('preview-canvas').style.display = 'block';
}

// 下载合并后的长图或当前轮播图
function downloadMergedImage() {
    // 如果是轮播模式，下载当前图片
    const carouselPreview = document.getElementById('carousel-preview');
    if (carouselPreview.style.display === 'flex') {
        const currentImg = carouselImages[currentCarouselIndex];
        const fileName = `轮播图${currentCarouselIndex + 1}.png`;
        
        // 创建临时canvas下载图片
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            ctx.drawImage(img, 0, 0, 800, 800);
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.src = currentImg.src;
        return;
    }
    
    // 长图模式
    if (!currentMergedCanvas) {
        alert('没有可下载的图片');
        return;
    }
    
    const fileName = '详情页长图.png';
    
    // 转换为blob并下载
    currentMergedCanvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// 关闭预览
function closePreview() {
    const modal = document.getElementById('preview-modal');
    modal.classList.remove('active');
    currentMergedCanvas = null;
    carouselImages = [];
    currentCarouselIndex = 0;
    
    // 重置下载按钮文字
    const downloadBtn = document.querySelector('.btn-download-merged');
    downloadBtn.textContent = '💾 下载长图';
}

// ESC键关闭预览
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('preview-modal');
        if (modal.classList.contains('active')) {
            closePreview();
        }
    }
});


// 更新轮播预览
function updateCarouselPreview() {
    const img = document.getElementById('carousel-preview-image');
    const counter = document.getElementById('carousel-counter');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    
    // 更新图片
    img.src = carouselImages[currentCarouselIndex].src;
    
    // 更新计数器
    counter.textContent = `${currentCarouselIndex + 1} / ${carouselImages.length}`;
    
    // 更新按钮状态
    prevBtn.disabled = currentCarouselIndex === 0;
    nextBtn.disabled = currentCarouselIndex === carouselImages.length - 1;
}

// 上一张
function prevCarouselImage() {
    if (currentCarouselIndex > 0) {
        currentCarouselIndex--;
        updateCarouselPreview();
    }
}

// 下一张
function nextCarouselImage() {
    if (currentCarouselIndex < carouselImages.length - 1) {
        currentCarouselIndex++;
        updateCarouselPreview();
    }
}

// 键盘控制
document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('preview-modal');
    if (!modal.classList.contains('active')) return;
    
    const carouselPreview = document.getElementById('carousel-preview');
    if (carouselPreview.style.display === 'flex') {
        if (e.key === 'ArrowLeft') {
            prevCarouselImage();
        } else if (e.key === 'ArrowRight') {
            nextCarouselImage();
        }
    }
});


// 重新生成单张图片
function regenerateImage(button, containerId) {
    const imageDiv = button.closest('.output-image');
    const mainImage = imageDiv.querySelector('.main-image');
    const imageNumber = imageDiv.querySelector('.image-number');
    const currentIndex = parseInt(imageNumber.textContent) - 1;
    
    // 添加加载动画
    imageDiv.classList.add('regenerating');
    button.innerHTML = '⏳';
    button.disabled = true;
    
    // 模拟生成延迟
    setTimeout(() => {
        // 生成新的颜色
        let newColor;
        if (containerId === 'carousel-output') {
            newColor = getCarouselColor(currentIndex);
            // 随机选择一个不同的颜色
            const colors = ['FF6B6B', '4ECDC4', 'FFE66D', '95E1D3', 'F38181', 'AA96DA', 'FCBAD3', 'A8E6CF'];
            newColor = colors[Math.floor(Math.random() * colors.length)];
        } else {
            const colors = ['5B84B1', 'FC766A', '5F4B8B', 'E69A8D', '42EADD', 'CDB599', 'FF8C42', '00B8A9', 'F8B500', 'E63946', '457B9D', '06FFA5', 'DD5E89'];
            newColor = colors[Math.floor(Math.random() * colors.length)];
        }
        
        // 更新图片
        const width = containerId === 'carousel-output' ? 800 : 750;
        const height = containerId === 'carousel-output' ? 800 : 1000;
        const fontSize = containerId === 'carousel-output' ? 48 : 36;
        const label = containerId === 'carousel-output' ? '轮播图' : '详情页';
        
        mainImage.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect fill='%23${newColor}' width='${width}' height='${height}'/%3E%3Ctext x='50%25' y='50%25' font-size='${fontSize}' fill='white' text-anchor='middle' dy='.3em'%3E${label}${currentIndex + 1}%3C/text%3E%3C/svg%3E`;
        
        // 移除加载状态
        imageDiv.classList.remove('regenerating');
        button.innerHTML = '🔄';
        button.disabled = false;
        
        // 添加成功动画
        imageDiv.classList.add('regenerate-success');
        setTimeout(() => {
            imageDiv.classList.remove('regenerate-success');
        }, 600);
    }, 800);
}
