// WebSocket 监听器 - 独立的 WebSocket 消息监听功能
// 这个文件包含了从 injectScript 中分离出来的 WebSocket 相关代码

export function createWebSocketMonitor() {
  return `
    // WebSocket 消息监听器
    (function() {
      console.log('WebSocket monitor initialized');

      // 简单的 Protobuf 解析器（针对聊天消息）
      function parseProtobufMessage(bytes) {
        let offset = 0;
        const result = {};
        let fieldCounter = 0;

        while (offset < bytes.length && fieldCounter < 100) { // 防止无限循环
          fieldCounter++;
          
          if (offset >= bytes.length) break;
          
          // 读取 varint（字段标识和类型）
          let varint = 0;
          let shift = 0;
          let byte;
          
          do {
            if (offset >= bytes.length) break;
            byte = bytes[offset++];
            varint |= (byte & 0x7F) << shift;
            shift += 7;
          } while (byte & 0x80);
          
          const fieldNumber = varint >> 3;
          const wireType = varint & 0x07;
          
          console.log(\`Field \${fieldNumber}, Wire Type \${wireType}, Offset \${offset}\`);
          
          try {
            switch (wireType) {
              case 0: // Varint
                let value = 0;
                let valueShift = 0;
                do {
                  if (offset >= bytes.length) break;
                  byte = bytes[offset++];
                  value |= (byte & 0x7F) << valueShift;
                  valueShift += 7;
                } while (byte & 0x80);
                result[\`field_\${fieldNumber}_varint\`] = value;
                break;
                
              case 2: // Length-delimited
                if (offset >= bytes.length) break;
                let length = 0;
                let lengthShift = 0;
                do {
                  if (offset >= bytes.length) break;
                  byte = bytes[offset++];
                  length |= (byte & 0x7F) << lengthShift;
                  lengthShift += 7;
                } while (byte & 0x80);
                
                if (offset + length > bytes.length) {
                  console.log(\`Length \${length} exceeds remaining bytes\`);
                  break;
                }
                
                const data = bytes.slice(offset, offset + length);
                offset += length;
                
                // 尝试解析为字符串
                try {
                  const str = new TextDecoder('utf-8').decode(data);
                  if (isPrintableString(str)) {
                    result[\`field_\${fieldNumber}_str\`] = str;
                  } else {
                    result[\`field_\${fieldNumber}_bytes\`] = Array.from(data);
                  }
                } catch (e) {
                  result[\`field_\${fieldNumber}_bytes\`] = Array.from(data);
                }
                break;
                
              default:
                console.log(\`Unsupported wire type \${wireType}\`);
                offset++; // 跳过未知类型
                break;
            }
          } catch (e) {
            console.log(\`Error parsing field \${fieldNumber}:\`, e);
            break;
          }
        }
        
        return result;
      }

      // 检查字符串是否可打印
      function isPrintableString(str) {
        return str.length > 0 && /^[\\x20-\\x7E\\u4e00-\\u9fff]*$/.test(str);
      }

      // WebSocket 消息解析函数
      function parseWebSocketMessage(base64Data) {
        try {
          // 解码 base64
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          console.log('WebSocket message bytes:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

          // 尝试解析消息内容
          const result = parseProtobufMessage(bytes);
          console.log('Parsed WebSocket message:', result);
          return result;
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          return null;
        }
      }

      // 从解析的 protobuf 数据中提取消息信息
      function extractMessageFromParsed(parsed) {
        const messageData = {
          username: '',
          content: '',
          avatar: '',
          unreadCount: 1,
          timestamp: Date.now(),
          senderId: ''
        };

        // 遍历解析结果，查找消息内容
        Object.keys(parsed).forEach(key => {
          const value = parsed[key];
          if (typeof value === 'string' && isPrintableString(value)) {
            if (value.length > 5 && value.length < 1000) {
              // 可能是消息内容
              if (!messageData.content || value.length > messageData.content.length) {
                messageData.content = value;
              }
            } else if (value.length > 0 && value.length <= 50) {
              // 可能是用户名
              if (!messageData.username) {
                messageData.username = value;
              }
            }
          }
        });

        // 如果找到了消息内容，返回消息数据
        if (messageData.content) {
          return messageData;
        }

        return null;
      }

      // 监听 WebSocket 消息
      function interceptWebSocket() {
        const originalWebSocket = window.WebSocket;

        window.WebSocket = function(url, protocols) {
          console.log('WebSocket connection to:', url);
          const ws = new originalWebSocket(url, protocols);

          // 监听消息
          const originalOnMessage = ws.onmessage;
          ws.onmessage = function(event) {
            console.log('WebSocket message received:', event);

            if (event.data instanceof ArrayBuffer) {
              const bytes = new Uint8Array(event.data);
              console.log('WebSocket binary message:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

              // 尝试解析消息
              const parsed = parseProtobufMessage(bytes);
              if (parsed) {
                console.log('Parsed WebSocket message:', parsed);

                // 提取消息内容和发送者信息
                const messageData = extractMessageFromParsed(parsed);
                if (messageData) {
                  console.log('Extracted message data:', messageData);

                  // 发送到主进程
                  if (window.electronAPI && window.electronAPI.send) {
                    window.electronAPI.send('websocket-message-received', messageData);
                  }
                }
              }
            } else if (typeof event.data === 'string') {
              console.log('WebSocket text message:', event.data);
            }

            // 调用原始处理函数
            if (originalOnMessage) {
              originalOnMessage.call(this, event);
            }
          };

          return ws;
        };

        // 保持原型链
        window.WebSocket.prototype = originalWebSocket.prototype;
      }

      // 测试解析提供的 base64 数据
      function testParseMessage() {
        const testData = 'AAABFgApAAQAAAGQGESqPIxQcC8tc21ncy1jbGllbnQtaWQtEAIY7QEK6gEIpd2CDBIIa2ltLXRleHQaIDUwNDczMjIxY2M2YjQxNWNhNGI2OWU3OGFhMDI2ZjY1IKnJraEFKPuwyuzHx6qiGDC5nAE4jN7jufIyQgwxMDAwMjE5MDgzMzliV3siZXh0Ijp7fSwic2VuZGVyX3Byb2ZpbGUiOnsidXRpbWUiOjE3MjY0NjUyNjR9LCJ2aXNpYmlsaXR5IjowLCJ0ZXh0X3R5cGUiOiJwbGFpblRleHQifWooCiYyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMsIBANIBBAgCEAKKAgA=';
        console.log('Testing parse of provided message...');
        const result = parseWebSocketMessage(testData);
        if (result) {
          console.log('Test parse result:', result);

          // 查找消息内容和发送者信息
          Object.keys(result).forEach(key => {
            if (key.includes('_str') && result[key]) {
              console.log(\`Found in test data - \${key}: \${result[key]}\`);
            }
          });
        }
      }

      // 启动 WebSocket 拦截
      interceptWebSocket();

      // 测试解析提供的消息
      testParseMessage();

      console.log('WebSocket monitor ready');
    })();
  `;
}

// 导出 WebSocket 监听器创建函数
export default createWebSocketMonitor;
