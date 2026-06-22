import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FolderPlus, Trash2, Folder, Film } from 'lucide-react';
import ContentCard from '../components/ContentCard';
import './MyList.css';

export default function MyList() {
  const { myList, watchlistFolders, createFolder, deleteFolder, moveToFolder } = useApp();
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  const onDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e, folderId) => {
    e.preventDefault();
    if (draggedItem && draggedItem.folder_id !== folderId) {
      moveToFolder(draggedItem.id, folderId);
    }
    setDraggedItem(null);
  };

  // Default folder is "All Movies" which has folder_id: null
  const defaultList = myList.filter(i => !i.folder_id);

  return (
    <div className="mylist-container page-content fade-in">
      <div className="mylist-header">
        <h1>Advanced Watchlists</h1>
        <p>Organize your saved movies and series. Drag and drop items between folders!</p>
      </div>

      <div className="folder-creation-bar">
        <form onSubmit={handleCreateFolder} className="folder-form">
          <input 
            type="text" 
            placeholder="New folder name... (e.g. Spooky Season)" 
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="folder-input"
          />
          <button type="submit" className="btn btn-primary btn-icon">
            <FolderPlus size={18} /> Create Folder
          </button>
        </form>
      </div>

      <div className="folders-grid">
        {/* Uncategorized (Default) Folder */}
        <div 
          className="folder-column"
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, null)}
        >
          <div className="folder-header">
            <div className="folder-title">
              <Film size={20} />
              <h2>Uncategorized</h2>
            </div>
            <span className="item-count">{defaultList.length} items</span>
          </div>
          <div className="folder-content">
            {defaultList.length === 0 && <div className="empty-folder">Drag items here</div>}
            {defaultList.map(item => (
              <div 
                key={item.id} 
                draggable 
                onDragStart={(e) => onDragStart(e, item)}
                className="draggable-card"
              >
                <ContentCard item={item} />
              </div>
            ))}
          </div>
        </div>

        {/* Custom Folders */}
        {watchlistFolders.map(folder => {
          const itemsInFolder = myList.filter(i => i.folder_id === folder.id);
          return (
            <div 
              key={folder.id} 
              className="folder-column"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, folder.id)}
            >
              <div className="folder-header">
                <div className="folder-title">
                  <Folder size={20} />
                  <h2>{folder.name}</h2>
                </div>
                <div className="folder-actions">
                  <span className="item-count">{itemsInFolder.length} items</span>
                  <button 
                    type="button" 
                    className="btn-icon-danger" 
                    onClick={() => deleteFolder(folder.id)}
                    title="Delete Folder"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="folder-content">
                {itemsInFolder.length === 0 && <div className="empty-folder">Drag items here</div>}
                {itemsInFolder.map(item => (
                  <div 
                    key={item.id} 
                    draggable 
                    onDragStart={(e) => onDragStart(e, item)}
                    className="draggable-card"
                  >
                    <ContentCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
