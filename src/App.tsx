import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TaskBoard } from './components/TaskBoard';
import { CompletionRecords } from './components/Records/CompletionRecords';
import { TaskProvider } from './context/TaskContext';

export default function App() {
  return (
    <TaskProvider>
      <BrowserRouter basename="/tool-pm/">
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<TaskBoard />} />
            <Route path="/records" element={<CompletionRecords />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TaskProvider>
  );
}
