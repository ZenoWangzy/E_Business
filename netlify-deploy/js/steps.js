// 步骤管理
let currentStep = 1;
let userData = {
    productImage: null,
    manuals: [],
    factoryInfo: [],
    category: null,
    template: null
};

function nextStep(step) {
    if (!validateStep(step)) {
        return;
    }
    
    // 标记当前步骤完成
    document.querySelector(`.progress-bar .step[data-step="${step}"]`).classList.add('completed');
    
    // 隐藏当前步骤
    document.getElementById(`step-${step}`).classList.remove('active');
    
    // 显示下一步骤
    currentStep = step + 1;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    document.querySelector(`.progress-bar .step[data-step="${currentStep}"]`).classList.add('active');
    
    // 如果是最后一步，生成详情页
    if (currentStep === 4) {
        generateDetailPages();
    }
}

function prevStep(step) {
    // 隐藏当前步骤
    document.getElementById(`step-${step}`).classList.remove('active');
    document.querySelector(`.progress-bar .step[data-step="${step}"]`).classList.remove('active');
    
    // 显示上一步骤
    currentStep = step - 1;
    document.getElementById(`step-${currentStep}`).classList.add('active');
}

function validateStep(step) {
    switch(step) {
        case 1:
            if (!userData.productImage) {
                alert('请上传商品白底图');
                return false;
            }
            return true;
        case 2:
            if (!userData.category) {
                alert('请选择商品品类');
                return false;
            }
            return true;
        case 3:
            if (!userData.template) {
                alert('请选择详情页风格');
                return false;
            }
            return true;
        default:
            return true;
    }
}

function restart() {
    currentStep = 1;
    userData = {
        productImage: null,
        manuals: [],
        factoryInfo: [],
        category: null,
        template: null
    };
    
    // 重置所有步骤
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.progress-bar .step').forEach(el => {
        el.classList.remove('active', 'completed');
    });
    
    document.getElementById('step-1').classList.add('active');
    document.querySelector('.progress-bar .step[data-step="1"]').classList.add('active');
    
    // 清空预览
    document.getElementById('product-preview').innerHTML = '';
    document.getElementById('manual-preview').innerHTML = '';
    document.getElementById('factory-preview').innerHTML = '';
    
    // 清空输出
    document.getElementById('carousel-output').innerHTML = '';
    document.getElementById('detail-output').innerHTML = '';
}
