# woaapp

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

首先安装私有库
npm install react-screenshots@0.5.23 electron-screenshots@0.5.28 --registry http://localhost:4873/

待办功能的设计：
1、用同样的方法，再新增一个待办事项的功能，也在侧边栏.tab-nav.tab-nav-frame里面插入一个 待办的图标，当有待办事项时，图标的div右上角会有一个红色的圆点，里面显示待办事项的数量，为0时，红点消失。
2、点击之后会弹出一个待办事项的弹窗界面，里面左边栏是一个tab切换，分别是“未处理”，“已处理”，右边展示块状列表，其中有标题和详情
3、其中标题的最右侧有3个按钮，编辑和已解决。点击一条数据的编辑按钮时，标题和详情都变成可编辑态，点击编辑后，编辑图标变成保存图标，点击保存则还原正常浏览状态，另外，双击编辑或者详情，都可以开启这条待办信息的编辑状态
4、待办列表中的每条信息，应该有标题，详情，时间，来自XXX
5、已处理列表中显示被标记为已解决的事项列表
6、待办事项的来源可以自己新建，在待办弹窗右上角会有一个新增弹窗，点击后，会切换到未处理选项卡，并新增一个空白的单条编辑标题和内容。
7、待办事项的来源主要来自于第三方的聊天页面中，需要给页面中聊天对话的鼠标右键弹窗里面添加一个选项“”“添加至待办”，就加在最后面，这个弹窗是一个ul标签class="v-context no-select context-menu-wrapper"，增加一个li选项<ul data-v-3103d376="" data-v-0838d42a="" tabindex="-1" role="menu" aria-hidden="false" class="v-context no-select context-menu-wrapper" style="top: 221px; left: 472px;"><li data-v-3103d376="" class=""><a data-v-3103d376="" href="javascript:;" draggable="false" data-type="msg-contextmenu-copy" class="" role="menuitem" tabindex="-1">复制</a></li><li data-v-3103d376="" class=""><a data-v-3103d376="" href="javascript:;" draggable="false" data-type="msg-contextmenu-rili-add-to-schedule" class="" role="menuitem" tabindex="-1">添加到日程</a></li></ul>
8、在对话内容的气泡上右键时才会展示这个弹窗，这时，就要获取这个气泡内部的内容，先暂存一下，<div data-v-258f5ece="" class="message-content"><div data-v-258f5ece="" class="message-body"><div data-v-258f5ece=""><div data-v-258f5ece="" item-msgid="1478761668" class="message-body-content"><!----><div data-v-258f5ece="" class="message-bg"><pre data-v-258f5ece="" class="not-current-user">321312</pre><!----></div></div><!----><!----></div><div data-v-258f5ece="" class="message-toolbar" style="width: 51px; min-height: 26px;"><!----></div></div></div>
当鼠标右键这个元素时，就获取鼠标右键所在这个地方的内容，比如上面这个dom结构中，321312就是内容，先暂存，当点击 添加至待办时，会弹出一个窗口要用户输入标题和详情，并将暂存的内容添加到标题中，这个弹窗还有保存 和取消按钮，点击保存数据则存到待办列表的未处理列表中，存在最上面，同时要更新一下主界面左边栏插入的那个按钮右上角的红点里面的待办数字，待办数字时和未处理列表的数据相等的，并且时时同步；
9，所有的数据都存在本地的store里面，暂时不做接口存储，以后还是会做的
10，这个待办功能请在main下新建一个文件来完成
