<template>
  <div class="todo-app">
    <h1>待办事项</h1>
    <div class="tabs">
      <button :class="{ active: activeTab === 'unprocessed' }" @click="activeTab = 'unprocessed'">未处理</button>
      <button :class="{ active: activeTab === 'processed' }" @click="activeTab = 'processed'">已处理</button>
    </div>

    <div class="todo-list">
      <div v-for="todo in filteredTodos" :key="todo.id" class="todo-item" :class="{ processed: todo.processed }">
        <div class="todo-content">
          <div v-if="editingTodo?.id !== todo.id">
            <h4>{{ todo.title }}</h4>
            <p>{{ todo.details }}</p>
            <small>来源: {{ todo.source }} | 时间: {{ new Date(todo.timestamp).toLocaleString() }}</small>
          </div>
          <div v-else class="edit-form">
            <input type="text" v-model="editingTodo.title" placeholder="标题" />
            <textarea v-model="editingTodo.details" placeholder="详情"></textarea>
          </div>
        </div>
        <div class="todo-actions">
          <template v-if="editingTodo?.id !== todo.id">
            <button @click="startEdit(todo)">编辑</button>
            <button v-if="!todo.processed" @click="markAsProcessed(todo)">已解决</button>
             <button @click="deleteTodo(todo.id)" class="delete">删除</button>
          </template>
          <template v-else>
            <button @click="saveEdit">保存</button>
            <button @click="cancelEdit">取消</button>
          </template>
        </div>
      </div>
    </div>

    <div class="add-todo-section">
        <button @click="showAddModal = true">新增待办</button>
    </div>

    <div v-if="showAddModal || newTodoFromChat" class="modal-overlay">
        <div class="modal-content">
            <h3>{{ newTodoFromChat ? '新增待办事项' : '新增待办'}}</h3>
            <input type="text" v-model="newTodo.title" placeholder="标题" />
            <textarea v-model="newTodo.details" placeholder="详情"></textarea>
            <input type="text" v-model="newTodo.source" placeholder="来源 (可选)" />
            <div class="modal-actions">
                <button @click="addNewTodo">确认新增</button>
                <button @click="closeAddModal">取消</button>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

interface TodoItem {
  id: string;
  title: string;
  details: string;
  timestamp: number;
  source: string;
  processed: boolean;
}

const todos = ref<TodoItem[]>([]);
const activeTab = ref('unprocessed'); // 'unprocessed' or 'processed'
const editingTodo = ref<TodoItem | null>(null);
const showAddModal = ref(false);
const newTodoFromChat = ref<string | null>(null);
const newTodo = ref({
    title: '',
    details: '',
    source: '手动新增'
});

const filteredTodos = computed(() => {
  if (activeTab.value === 'unprocessed') {
    return todos.value.filter(t => !t.processed);
  } else {
    return todos.value.filter(t => t.processed);
  }
});

async function fetchTodos() {
  todos.value = await window.api.getTodos();
}

function startEdit(todo: TodoItem) {
  editingTodo.value = { ...todo };
}

async function saveEdit() {
  if (editingTodo.value) {
    const updated = await window.api.updateTodo(editingTodo.value);
    const index = todos.value.findIndex(t => t.id === updated.id);
    if (index !== -1) {
      todos.value[index] = updated;
    }
    cancelEdit();
    await fetchTodos();
  }
}

function cancelEdit() {
  editingTodo.value = null;
}

async function markAsProcessed(todo: TodoItem) {
  const updatedTodo = { ...todo, processed: true };
  await window.api.updateTodo(updatedTodo);
  await fetchTodos();
}

async function deleteTodo(todoId: string) {
    if(confirm('确定要删除这个待办事项吗？')){
        await window.api.deleteTodo(todoId);
        await fetchTodos();
    }
}

function closeAddModal() {
    showAddModal.value = false;
    newTodoFromChat.value = null;
    newTodo.value = { title: '', details: '', source: '手动新增' };
}

async function addNewTodo() {
    if (!newTodo.value.title) {
        alert('标题不能为空');
        return;
    }
    await window.api.addTodo(newTodo.value);
    closeAddModal();
    await fetchTodos();
}

onMounted(() => {
  fetchTodos();

  // 监听从聊天添加到待办的事件
  window.electron.ipcRenderer.on('show-add-todo-modal', (event, text) => {
      newTodo.value.title = '来自聊天的待办';
      newTodo.value.details = text;
      newTodo.value.source = '聊天记录';
      showAddModal.value = true;
  });
});

</script>

<style scoped>
.todo-app {
  padding: 20px;
  font-family: sans-serif;
}

.tabs {
  margin-bottom: 20px;
}

.tabs button {
  padding: 10px 20px;
  margin-right: 10px;
  cursor: pointer;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
}

.tabs button.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.todo-item.processed {
  background-color: #e9e9e9;
  text-decoration: line-through;
}

.todo-content {
  flex-grow: 1;
}

.todo-content h4 {
  margin: 0 0 5px 0;
}

.todo-content p {
  margin: 0 0 10px 0;
  color: #555;
}

.todo-content small {
  color: #888;
}

.todo-actions button {
  margin-left: 10px;
  padding: 5px 10px;
  cursor: pointer;
}

.todo-actions button.delete {
    background-color: #ff4d4d;
    color: white;
}

.edit-form input,
.edit-form textarea {
    width: 95%;
    padding: 8px;
    margin-bottom: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.add-todo-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: white;
    padding: 30px;
    border-radius: 8px;
    width: 500px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.modal-content h3 {
    margin-top: 0;
}

.modal-content input,
.modal-content textarea {
    width: 100%;
    padding: 10px;
    margin-bottom: 15px;
    box-sizing: border-box;
}

.modal-actions {
    text-align: right;
}

.modal-actions button {
    margin-left: 10px;
}
</style>
