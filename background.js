// 后台服务脚本，处理跨标签页通信和全局状态

// 调试函数：检查 Chrome API 状态
function debugChromeAPI() {
  console.log('后台服务：检查 Chrome API 状态...');
  
  if (typeof chrome === 'undefined') {
    console.error('chrome 对象未定义');
    return false;
  }

  if (!chrome.runtime) {
    console.error('chrome.runtime 未定义');
    return false;
  }

  if (!chrome.storage || !chrome.storage.local) {
    console.error('chrome.storage.local 未定义');
    return false;
  }

  console.log('后台服务：Chrome API 检查通过');
  return true;
}

// 安全的存储操作
async function safeStorageOperation(action, data = {}) {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      throw new Error('Chrome 存储 API 未初始化');
    }

    return new Promise((resolve, reject) => {
      switch (action) {
        case 'save':
          chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve('保存成功');
            }
          });
          break;
        case 'get':
          chrome.storage.local.get(data, (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result);
            }
          });
          break;
        default:
          reject(new Error('未知的存储操作'));
      }
    });
  } catch (error) {
    console.error('存储操作错误:', error);
    throw error;
  }
}

// 初始化：检查 API 状态
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI问题解答助手已安装');
  debugChromeAPI();
});

// 跨标签页通信处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.group('🔍 后台服务消息处理');
  console.log('收到消息:', request);
  console.log('发送者信息:', sender);

  try {
    // 处理全局状态和跨标签页通信
    switch (request.action) {
      case 'saveGlobalState':
        safeStorageOperation('save', request.data)
          .then(() => {
            console.log('✅ 全局状态保存成功');
            sendResponse({ status: 'success' });
          })
          .catch(error => {
            console.error('❌ 保存全局状态失败:', error);
            sendResponse({ status: 'error', message: error.message });
          });
        return true;  // 支持异步响应

      case 'getGlobalState':
        safeStorageOperation('get', request.keys)
          .then(result => {
            console.log('✅ 获取全局状态成功');
            sendResponse({ status: 'success', data: result });
          })
          .catch(error => {
            console.error('❌ 获取全局状态失败:', error);
            sendResponse({ status: 'error', message: error.message });
          });
        return true;  // 支持异步响应

      default:
        console.warn('⚠️ 未知的消息类型:', request.action);
        sendResponse({ status: 'error', message: '未知的消息类型' });
        return false;
    }
  } catch (error) {
    console.error('❌ 消息处理发生严重错误:', error);
    sendResponse({ status: 'error', message: '消息处理发生严重错误' });
  } finally {
    console.groupEnd();
  }
});

// 错误处理和日志记录
chrome.runtime.onError.addListener((error) => {
  console.error('后台服务发生错误:', error);
});

// 添加全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误捕获:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});
