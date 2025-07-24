/**
 * 表情模糊功能脚本
 * 通过添加 CSS 类来实现聊天消息的模糊效果
 */

export function getEmotionBlurInjectScript(): string {
    return `
    (function() {
      console.log('🎭 Emotion blur script loaded');

      let isBlurred = false;
      let emotionButton = null;

      // 从主进程获取状态存储函数
      const getStoredBlurState = async () => {
        try {
          return await window.api?.getEmotionBlurState?.() || false;
        } catch (error) {
          console.warn('🎭 Failed to get stored blur state:', error);
          return false;
        }
      };

      const setStoredBlurState = async (state) => {
        try {
          await window.api?.setEmotionBlurState?.(state);
        } catch (error) {
          console.warn('🎭 Failed to set stored blur state:', error);
        }
      };

      // 初始化时读取存储的状态
      const initBlurState = async () => {
        try {
          const storedState = await getStoredBlurState();
          console.log('🎭 Retrieved stored blur state:', storedState);
          if (storedState) {
            isBlurred = false; // 先设为false，然后通过toggleBlur切换到true
            setTimeout(() => {
              toggleBlur(); // 应用存储的模糊状态
            }, 100);
          }
        } catch (error) {
          console.warn('🎭 Failed to initialize blur state:', error);
        }
      };

      // SVG 图标定义
      const FACE_G_SVG = \`<svg t="1753186141578" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13340" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32"><path d="M20.014 512.002a491.988 491.988 0 1 0 983.976 0 491.988 491.988 0 1 0-983.976 0z" fill="#FDDF6D" p-id="13341"></path><path d="M617.43 931.356c-271.716 0-491.986-220.268-491.986-491.986 0-145.168 62.886-275.632 162.888-365.684C129.054 155.124 20.014 320.828 20.014 512c0 271.716 220.268 491.986 491.986 491.986 126.548 0 241.924-47.796 329.098-126.298-67.106 34.31-143.124 53.668-223.668 53.668z" fill="#FCC56B" p-id="13342"></path><path d="M283.596 359.704a142.718 142.718 0 1 0 285.436 0 142.718 142.718 0 1 0-285.436 0zM683.836 359.704a142.718 142.718 0 1 0 285.436 0 142.718 142.718 0 1 0-285.436 0z" fill="#FFFFFF" p-id="13343"></path><path d="M300.576 556.564c-36.536 0-66.156 29.62-66.156 66.156h132.314c-0.004-36.538-29.622-66.156-66.158-66.156z m577.052 0c-36.536 0-66.156 29.62-66.156 66.156h132.314c0-36.538-29.622-66.156-66.158-66.156z" fill="#F9A880" p-id="13344"></path><path d="M717.692 710.348H504.616c-11.054 0-20.014-8.958-20.014-20.014s8.962-20.014 20.014-20.014h213.076c11.054 0 20.014 8.958 20.014 20.014 0.002 11.056-8.96 20.014-20.014 20.014z" fill="" p-id="13345"></path><path d="M410.3 359.704a40.03 40.03 0 1 0 80.06 0 40.03 40.03 0 1 0-80.06 0zM816.438 359.704a40.03 40.03 0 1 0 80.06 0 40.03 40.03 0 1 0-80.06 0z" fill="#7F184C" p-id="13346"></path><path d="M976.296 296.028c-24.834-58.17-82.6-99.052-149.742-99.052-89.732 0-162.732 73-162.732 162.732s73 162.732 162.732 162.732c66.774 0 124.256-40.44 149.316-98.102a475.43 475.43 0 0 1 8.104 87.656c0 260.248-211.724 471.968-471.97 471.968S40.03 772.248 40.03 512 251.752 40.03 512 40.03c85.956 0 170.084 23.324 243.29 67.452 9.468 5.71 21.768 2.658 27.474-6.808 5.706-9.468 2.658-21.768-6.808-27.474C696.514 25.312 605.24 0 512 0 229.68 0 0 229.68 0 512c0 282.316 229.68 512 512 512s512-229.68 512-511.998c0-75.548-16.076-148.154-47.704-215.974z m-27.042 63.684c0 67.66-55.044 122.704-122.704 122.704S703.846 427.37 703.846 359.712 758.89 237.008 826.55 237.008c48.02 0 89.66 27.744 109.804 68.028 0.136 0.322 0.256 0.648 0.41 0.966 1.016 2.092 1.972 4.206 2.956 6.308a121.964 121.964 0 0 1 9.534 47.402z" fill="" p-id="13347"></path><path d="M426.326 196.98c-89.732 0-162.732 73-162.732 162.732s73 162.732 162.732 162.732 162.732-73 162.732-162.732S516.056 196.98 426.326 196.98z m0 285.436c-67.66 0-122.704-55.046-122.704-122.704s55.044-122.704 122.704-122.704S549.03 292.054 549.03 359.712s-55.046 122.704-122.704 122.704z m58.276 207.914c0 11.056 8.962 20.014 20.014 20.014h213.076c11.054 0 20.014-8.958 20.014-20.014s-8.962-20.014-20.014-20.014H504.616c-11.054 0-20.014 8.958-20.014 20.014zM806.54 132.542a20.014 20.014 0 1 0 40.028 0 20.014 20.014 0 1 0-40.028 0z" fill="" p-id="13348"></path></svg>\`;

      const FACE_C_SVG = \`<svg t="1753186212884" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="18332" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32"><path d="M512.003 512.003m-491.988961 0a491.988961 491.988961 0 1 0 983.977922 0 491.988961 491.988961 0 1 0-983.977922 0Z" fill="#FDDF6D" p-id="18333"></path><path d="M617.433206 931.357819c-271.716531 0-491.986961-220.26843-491.986961-491.986961 0-145.168284 62.886123-275.632538 162.888318-365.684714C129.054252 155.124303 20.014039 320.828627 20.014039 512.001c0 271.716531 220.26843 491.986961 491.986961 491.986961 126.548247 0 241.924473-47.796093 329.098643-126.298247-67.102131 34.310067-143.12428 53.668105-223.666437 53.668105z" fill="#FCC56B" p-id="18334"></path><path d="M426.314833 359.704703m-60.044118 0a60.044117 60.044117 0 1 0 120.088235 0 60.044117 60.044117 0 1 0-120.088235 0Z" fill="#FFFFFF" p-id="18335"></path><path d="M764.375493 359.704703m-60.044117 0a60.044117 60.044117 0 1 0 120.088234 0 60.044117 60.044117 0 1 0-120.088234 0Z" fill="#FFFFFF" p-id="18336"></path><path d="M785.699535 833.131627H416.972814c-27.324053 0-49.474097-22.150043-49.474096-49.474096v-183.93036c0-27.324053 22.150043-49.474097 49.474096-49.474096h368.724721c27.324053 0 49.474097 22.150043 49.474096 49.474096v183.93036c0 27.324053-22.148043 49.474097-49.472096 49.474096z" fill="#FFFFFF" p-id="18337"></path><path d="M502.368981 763.09749c-27.324053 0-49.474097-22.150043-49.474096-49.474096v-163.368319h-35.922071c-27.324053 0-49.474097 22.150043-49.474096 49.474096v183.93036c0 27.324053 22.150043 49.474097 49.474096 49.474096h368.724721c27.324053 0 49.474097-22.150043 49.474096-49.474096v-20.562041H502.368981z" fill="#F2F2F2" p-id="18338"></path><path d="M346.268676 359.712703c0 44.144086 35.91407 80.058156 80.058157 80.058156s80.058156-35.91407 80.058156-80.058156-35.91407-80.058156-80.058156-80.058157-80.058156 35.91407-80.058157 80.058157z m120.088235 0c0 22.072043-17.958035 40.030078-40.030078 40.030078s-40.030078-17.958035-40.030079-40.030078 17.958035-40.030078 40.030079-40.030079 40.030078 17.956035 40.030078 40.030079zM764.375493 439.772859c44.144086 0 80.058156-35.91407 80.058156-80.058156s-35.91407-80.058156-80.058156-80.058157-80.058156 35.91407-80.058156 80.058157 35.91407 80.058156 80.058156 80.058156z m0-120.090235c22.072043 0 40.030078 17.958035 40.030078 40.030079s-17.958035 40.030078-40.030078 40.030078-40.030078-17.958035-40.030078-40.030078 17.956035-40.030078 40.030078-40.030079z" fill="" p-id="18339"></path><path d="M950.153856 776.647517c32.130063-52.996104 54.912107-112.256219 66.060129-175.480343 0.298001-1.164002 0.502001-2.352005 0.590001-3.550007A513.289003 513.289003 0 0 0 1024.002 511.999c0-97.538191-27.534054-192.406376-79.630156-274.342536-50.694099-79.734156-122.232239-143.860281-206.874404-185.448362-9.924019-4.87201-21.918043-0.782002-26.790052 9.138018-4.87201 9.922019-0.784002 21.918043 9.138018 26.790052 78.042152 38.342075 144.000281 97.47219 190.748373 170.998334 48.004094 75.506147 73.380143 162.946318 73.380143 252.866494 0 24.348048-1.854004 48.272094-5.428011 71.64014-10.17202 5.08601-31.752062 13.868027-64.770126 17.320034-28.314055 2.960006-48.560095 2.924006-60.864119 2.336004v-3.562007c0-38.316075-31.172061-69.488136-69.488136-69.488135H414.70081c-38.316075 0-69.488136 31.172061-69.488136 69.488135v1.660004c-35.58607 0.664001-114.190223 0.700001-176.916345-9.510019l-0.604001-0.098c-31.528062-5.13201-73.976144-12.040024-125.418245-33.788066a475.646929 475.646929 0 0 1-2.244005-45.99409C40.030078 251.752492 251.756492 40.030078 512.001 40.030078c11.056022 0 20.014039-8.958017 20.014039-20.014039S523.057022 0 512.001 0C229.680449 0 0 229.680449 0 511.999c0 20.57004 1.254002 40.84808 3.624007 60.788119 0.046 0.804002 0.134 1.598003 0.274001 2.386004 9.536019 77.142151 36.288071 149.024291 76.298149 211.664414 0.838002 1.834004 1.946004 3.530007 3.282006 5.03001C175.010342 931.541819 332.89865 1023.998 512.001 1023.998c183.444358 0 344.638673-96.996189 435.06485-242.378473a20.078039 20.078039 0 0 0 3.088006-4.97201z m-83.310163-133.01026c13.272026 0 30.300059-0.694001 51.0901-2.866005 20.54604-2.146004 37.494073-6.044012 50.970099-10.276021-11.112022 42.820084-28.122055 83.286163-50.072097 120.508236-6.708013 1.148002-17.746035 2.520005-32.330064 2.520005-12.572025 0-24.524048-1.030002-33.588065-2.106004v-108.058211c4.066008 0.166 8.692017 0.278001 13.930027 0.278zM385.240752 599.729171c0-16.244032 13.216026-29.458058 29.458058-29.458057H783.42153c16.244032 0 29.458058 13.216026 29.458058 29.458057v183.92836c0 16.244032-13.216026 29.458058-29.458058 29.458057H414.70081c-16.244032 0-29.458058-13.216026-29.458058-29.458057v-183.92836zM161.262315 631.295233l0.604001 0.096c52.350102 8.520017 114.580224 10.26802 156.622306 10.26802 10.26602 0 19.302038-0.104 26.726052-0.24v110.642216c-18.264036 4.552009-30.49206 6.816013-57.934113 10.048019-60.302118 7.098014-118.170231 6.448013-176.584345-1.970003-29.336057-47.272092-50.554099-100.074195-61.69812-156.462306 45.608089 16.756033 83.276163 22.896045 112.264219 27.618054zM512.001 983.971922c-150.068293 0-283.996555-70.410138-370.502724-179.922352a699.741367 699.741367 0 0 0 64.090126 2.968006c28.458056 0 57.146112-1.722003 86.364168-5.16201 24.860049-2.924006 38.884076-5.31601 53.914106-8.786017 4.612009 33.878066 33.710066 60.074117 68.832134 60.074117H783.42153c35.61207 0 65.038127-26.932053 69.016135-61.49812 9.668019 1.028002 21.520042 1.900004 34.060066 1.900004 1.402003 0 2.752005-0.022 4.098008-0.042-86.110168 115.520226-223.760437 190.468372-378.594739 190.468372z" fill="" p-id="18340"></path><path d="M660.40729 45.334089m-20.014039 0a20.014039 20.014039 0 1 0 40.028078 0 20.014039 20.014039 0 1 0-40.028078 0Z" fill="" p-id="18341"></path></svg>\`;

      const FACE_D_SVG = \`<svg t="1753364261358" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8462" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32"><path d="M512.002 512.002m-491.988 0a491.988 491.988 0 1 0 983.976 0 491.988 491.988 0 1 0-983.976 0Z" fill="#FDDF6D" p-id="8463"></path><path d="M617.432 931.356c-271.716 0-491.986-220.268-491.986-491.986 0-145.168 62.886-275.632 162.888-365.684C129.054 155.124 20.014 320.828 20.014 512c0 271.716 220.268 491.986 491.986 491.986 126.548 0 241.924-47.796 329.098-126.298-67.102 34.31-143.124 53.668-223.666 53.668z" fill="#FCC56B" p-id="8464"></path><path d="M426.314 359.704m-142.718 0a142.718 142.718 0 1 0 285.436 0 142.718 142.718 0 1 0-285.436 0Z" fill="#FFFFFF" p-id="8465"></path><path d="M826.554 359.704m-142.718 0a142.718 142.718 0 1 0 285.436 0 142.718 142.718 0 1 0-285.436 0Z" fill="#FFFFFF" p-id="8466"></path><path d="M300.576 556.564c-36.536 0-66.156 29.62-66.156 66.158h132.314c-0.004-36.54-29.622-66.158-66.158-66.158zM877.628 547.698c-36.536 0-66.156 29.62-66.156 66.158h132.314c0-36.538-29.618-66.158-66.158-66.158z" fill="#F9A880" p-id="8467"></path><path d="M390.526 285.09m-40.03 0a40.03 40.03 0 1 0 80.06 0 40.03 40.03 0 1 0-80.06 0Z" fill="#7F184C" p-id="8468"></path><path d="M796.612 282.314m-40.03 0a40.03 40.03 0 1 0 80.06 0 40.03 40.03 0 1 0-80.06 0Z" fill="#7F184C" p-id="8469"></path><path d="M553.388 822.268a19.932 19.932 0 0 1-10.272-2.85c-9.482-5.684-12.558-17.976-6.874-27.458 27.59-46.018 76.732-74.606 128.244-74.606a146.14 146.14 0 0 1 45.684 7.282c10.504 3.448 16.22 14.758 12.77 25.262-3.45 10.498-14.76 16.222-25.262 12.766a106.238 106.238 0 0 0-33.192-5.282c-37.528 0-73.51 21.136-93.908 55.16a20.02 20.02 0 0 1-17.19 9.726z" fill="#7F184C" p-id="8470"></path><path d="M976.568 296.66a162.334 162.334 0 0 0-7.144-14.786c-0.916-1.814-1.79-3.65-2.724-5.452a19.944 19.944 0 0 0-3.282-4.576c-28.984-44.988-79.486-74.866-136.864-74.866-89.732 0-162.732 73-162.732 162.732 0 89.73 73 162.73 162.732 162.73 66.794 0 124.292-40.462 149.336-98.15 5.354 28.624 8.084 57.894 8.084 87.708 0 260.248-211.724 471.968-471.97 471.968S40.03 772.248 40.03 512 251.752 40.03 512 40.03c73.236 0 143.414 16.308 208.588 48.47 9.906 4.892 21.914 0.824 26.804-9.09 4.892-9.914 0.822-21.914-9.092-26.806C667.572 17.698 591.434 0 512 0 229.68 0 0 229.68 0 512c0 282.316 229.68 512 512 512s512-229.68 512-511.998c0-74.35-16.38-148.314-47.432-215.342z m-27.314 63.052c0 67.66-55.044 122.7-122.704 122.7s-122.704-55.044-122.704-122.7 55.044-122.704 122.704-122.704c46.26 0 86.612 25.742 107.516 63.646a477.884 477.884 0 0 1 5.604 11.532 121.936 121.936 0 0 1 9.584 47.526z" fill="" p-id="8471"></path><path d="M426.326 196.98c-89.732 0-162.732 73-162.732 162.732 0 89.73 73 162.73 162.732 162.73s162.732-73 162.732-162.73c0.002-89.732-73.002-162.732-162.732-162.732z m0 285.432c-67.66 0-122.704-55.044-122.704-122.7s55.044-122.704 122.704-122.704 122.704 55.046 122.704 122.704-55.046 122.7-122.704 122.7zM543.116 819.42a20.008 20.008 0 0 0 27.458-6.878c20.398-34.026 56.38-55.16 93.908-55.16 11.358 0 22.524 1.778 33.19 5.282 10.502 3.456 21.814-2.266 25.264-12.764 3.45-10.502-2.262-21.814-12.764-25.264a145.99 145.99 0 0 0-45.69-7.282c-51.516 0-100.652 28.588-128.244 74.606-5.68 9.482-2.604 21.776 6.878 27.46z" fill="" p-id="8472"></path><path d="M791.274 106.798m-20.014 0a20.014 20.014 0 1 0 40.028 0 20.014 20.014 0 1 0-40.028 0Z" fill="" p-id="8473"></path></svg>\`;
    
      // 添加 CSS 样式到页面
    function injectBlurStyles() {
        if (document.getElementById('emotion-blur-styles')) {
            return; // 已经注入过了
        }

        const style = document.createElement('style');
        style.id = 'emotion-blur-styles';
        style.textContent = \`
          /* 模糊状态的 CSS 类 */
          .chat-messages-blurred .chat-message {
            filter: blur(3px) !important;
            transition: filter 0.3s ease !important;
          }

          /* 表情按钮样式 */
          .emotion-blur-button {
            width: 24px !important;
            height: 24px !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 4px !important;
            transition: all 0.2s ease !important;
            color: #666 !important;
            flex-shrink: 0 !important;
          }

          .emotion-blur-button:hover {
            // background-color: rgba(0, 0, 0, 0.1) !important;
            color: #333 !important;
          }
        \`;
        document.head.appendChild(style);
        console.log('🎭 Blur styles injected');
      }

      // 创建表情按钮
      function createEmotionButton() {
        const button = document.createElement('div');
        button.className = 'emotion-blur-button';
        button.innerHTML = FACE_G_SVG;
        button.title = '模糊/显示聊天内容';

        // 鼠标悬停效果
        button.addEventListener('mouseenter', () => {
          if (!isBlurred) {
            // 当前是显示状态(FACE_G)，悬停时显示FACE_D
            button.innerHTML = FACE_D_SVG;
          }
        });

        button.addEventListener('mouseleave', () => {
          if (!isBlurred) {
            // 当前是显示状态，离开时恢复FACE_G
            button.innerHTML = FACE_G_SVG;
          }
        });

        // 点击事件
        button.addEventListener('click', toggleBlur);

        return button;
      }

      // 切换模糊效果 - 使用更高效的 CSS 类方法
      async function toggleBlur() {
        console.log('🎭 Toggling blur effect, current state:', isBlurred);

        // 查找所有的聊天消息容器
        const messageWrappers = document.querySelectorAll('.vue-recycle-scroller__item-wrapper');
        console.log('🎭 Found message wrappers:', messageWrappers.length);

        if (!isBlurred) {
          // 添加模糊效果 - 给每个容器添加模糊类
          messageWrappers.forEach(wrapper => {
            wrapper.classList.add('chat-messages-blurred');
          });

          // 更换图标为 FACE_C
          if (emotionButton) {
            emotionButton.innerHTML = FACE_C_SVG;
            emotionButton.title = '显示聊天内容';
          }

          isBlurred = true;
          console.log('🎭 Applied blur effect to', messageWrappers.length, 'wrappers');
          
          // 保存状态到store
          await setStoredBlurState(true);
        } else {
          // 移除模糊效果
          messageWrappers.forEach(wrapper => {
            wrapper.classList.remove('chat-messages-blurred');
          });

          // 更换图标为 FACE_G
          if (emotionButton) {
            emotionButton.innerHTML = FACE_G_SVG;
            emotionButton.title = '模糊聊天内容';
          }

          isBlurred = false;
          console.log('🎭 Removed blur effect from', messageWrappers.length, 'wrappers');
          
          // 保存状态到store
          await setStoredBlurState(false);
        }
      }

      // 监听新增的消息容器
      function observeMessageWrappers() {
        const chatContainer = document.querySelector('.chat-content') || document.querySelector('.vue-recycle-scroller');
        if (!chatContainer) {
          console.log('🎭 Chat container not found for observation');
          return;
        }

        const observer = new MutationObserver((mutations) => {
          if (isBlurred) {
            let newWrappersFound = false;
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList) {
                  // 检查新增的节点是否是消息容器
                  if (node.classList.contains('vue-recycle-scroller__item-wrapper')) {
                    node.classList.add('chat-messages-blurred');
                    newWrappersFound = true;
                  }

                  // 或者查找子元素中的消息容器
                  const childWrappers = node.querySelectorAll('.vue-recycle-scroller__item-wrapper');
                  if (childWrappers.length > 0) {
                    childWrappers.forEach(wrapper => {
                      wrapper.classList.add('chat-messages-blurred');
                    });
                    newWrappersFound = true;
                  }
                }
              });
            });

            if (newWrappersFound) {
              console.log('🎭 Applied blur to newly added message wrappers');
            }
          }
        });

        observer.observe(chatContainer, {
          childList: true,
          subtree: true
        });

        console.log('🎭 Message wrappers observer started');
      }

      // 插入按钮到侧边栏
      function insertEmotionButton() {
        const sidebarBottom = document.querySelector('.sidebar-bottom');

        if (!sidebarBottom) {
          console.log('🎭 Sidebar bottom not found, retrying...');
          return false;
        }

        // 检查是否已经插入过按钮
        if (document.querySelector('.emotion-blur-button')) {
          console.log('🎭 Emotion button already exists');
          return true;
        }

        emotionButton = createEmotionButton();
        
        // 插入到第一个子节点位置
        if (sidebarBottom.firstChild) {
          sidebarBottom.insertBefore(emotionButton, sidebarBottom.firstChild);
          console.log('🎭 Emotion button inserted at first position');
        } else {
          sidebarBottom.appendChild(emotionButton);
          console.log('🎭 Emotion button inserted as first child');
        }

        return true;
      }

      // 初始化函数
      async function init() {
        console.log('🎭 Initializing emotion blur functionality');

        // 注入 CSS 样式
        injectBlurStyles();

        // 初始化状态
        await initBlurState();

        // 尝试插入按钮
        if (insertEmotionButton()) {
          // 开始监听消息容器变化
          observeMessageWrappers();

          console.log('🎭 Emotion blur functionality initialized successfully');
        } else {
          // 如果侧边栏还没加载完成，等待一段时间后重试
          setTimeout(init, 1000);
        }
      }

      // 等待页面加载完成后初始化
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        // 如果页面已经加载完成，延迟一下执行以确保目标元素已存在
        setTimeout(init, 500);
      }

      // 暴露全局函数供调试使用
      window.emotionBlurToggle = toggleBlur;
      window.emotionBlurDebug = {
        isBlurred: () => isBlurred,
        getWrappers: () => document.querySelectorAll('.vue-recycle-scroller__item-wrapper'),
        getBlurredWrappers: () => document.querySelectorAll('.vue-recycle-scroller__item-wrapper.chat-messages-blurred')
      };

    })();
  `
    }
