import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Coffee, CupSoda, Utensils, Search, ShoppingBag, Trash2, 
  Plus, Minus, CreditCard, Receipt, X, ChefHat, LayoutDashboard, 
  Store, TrendingUp, History, Package, AlertCircle, RefreshCw,
  Edit, Save, PlusCircle, Image as ImageIcon, Tag, Star, Heart, 
  Gift, Zap, MapPin, Grid, Layers, Calendar, Calculator,
  Briefcase, Watch, Glasses, Shirt, Scissors, Umbrella, 
  Anchor, Sun, Cloud, Music, Camera, Smartphone, Headphones, 
  Book, Gamepad2, Home, Smile, Wallet, Fish,
  Download, Upload, FileJson, CheckCircle, Settings, Link as LinkIcon,
  CalendarPlus, ArrowUp, ArrowDown, CalendarDays, CalendarRange, Map,
  LogOut, Database, Activity, Banknote, QrCode
} from 'lucide-react';

// Firebase SDK imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, updateDoc, deleteDoc, writeBatch, setDoc, getDoc 
} from 'firebase/firestore';

// --- 全域變數 ---
let app, auth, db, firebaseConfig, appId;
let isConfigured = false;
let configError = null;

// --- 初始範例資料 (修復原本缺失的變數) ---
const INITIAL_CATEGORIES = [
  { name: '飲品', icon: 'Coffee' },
  { name: '主食', icon: 'Utensils' },
  { name: '點心', icon: 'Package' }
];

const INITIAL_PRODUCTS = [
  { name: '招牌咖啡', price: 60, categoryName: '飲品', image: '' },
  { name: '經典排骨飯', price: 100, categoryName: '主食', image: '' },
  { name: '巧克力蛋糕', price: 80, categoryName: '點心', image: '' }
];

// --- 系統自動判斷環境與設定 ---
try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    firebaseConfig = JSON.parse(__firebase_config);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  } else {
    const savedConfig = localStorage.getItem('pos_firebase_config');
    if (savedConfig) {
      firebaseConfig = JSON.parse(savedConfig);
      appId = 'public-pos-store'; 
    }
  }

  if (firebaseConfig) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;
  }
} catch (e) {
  console.error("Firebase 初始化嚴重錯誤:", e);
  configError = e.message;
  isConfigured = false;
}

// --- 圖片壓縮 Helper ---
const resizeImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500; 
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- Helper: 解析設定字串 ---
const parseConfigString = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    const config = {};
    const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    let foundAny = false;
    keys.forEach(key => {
      const regex = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`);
      const match = str.match(regex);
      if (match) {
        config[key] = match[1];
        foundAny = true;
      }
    });
    if (foundAny) return config;
    return null;
  }
};

// --- 圖示與圖片處理元件 ---
const ICON_MAP = {
  ShoppingBag, Coffee, CupSoda, Utensils, ChefHat, 
  Package, Star, Heart, Gift, Zap, MapPin, Tag, Grid, Layers,
  Briefcase, Watch, Glasses, Shirt, Scissors, Umbrella, 
  Anchor, Sun, Cloud, Music, Camera, Smartphone, Headphones, 
  Book, Gamepad2, Home, Smile, Wallet, Fish
};

const getIconComponent = (iconName, size = 18) => {
  const Icon = ICON_MAP[iconName] || Package;
  return <Icon size={size} />;
};

const ProductImage = ({ src, alt, className }) => {
  const isUrl = src && (src.startsWith('http') || src.startsWith('data:'));
  if (isUrl) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={`object-cover w-full h-full ${className}`} 
        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x400?text=Error"; }} 
      />
    );
  }
  return <div className={`flex items-center justify-center bg-slate-100 text-4xl w-full h-full ${className}`}>{src || '📦'}</div>;
};

// --- 組件：設定畫面 ---
const SetupScreen = () => {
  const [inputConfig, setInputConfig] = useState('');
  const [error, setError] = useState('');

  const handleSaveConfig = () => {
    setError('');
    const config = parseConfigString(inputConfig);
    if (!config || !config.apiKey || !config.projectId) {
      setError('設定無效：找不到 apiKey 或 projectId。請確保複製完整的 firebaseConfig 物件。');
      return;
    }
    try {
      localStorage.setItem('pos_firebase_config', JSON.stringify(config));
      window.location.reload(); 
    } catch (e) {
      setError('瀏覽器儲存失敗: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-200 font-sans">
      <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-600 p-3 rounded-xl"><Settings size={32} className="text-white" /></div>
          <h1 className="text-3xl font-bold text-white">CloudPOS 設定</h1>
        </div>
        {configError && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            <strong>系統偵測到錯誤：</strong> {configError} <br/>
            請嘗試重新輸入設定。
          </div>
        )}
        <div className="space-y-6">
          <div className="bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-xl">
            <h3 className="font-bold text-indigo-400 text-lg mb-2">需要連結資料庫</h3>
            <p className="text-slate-300 text-sm">請將 Firebase Console 中的 <code>firebaseConfig</code> 完整複製並貼在下方。</p>
          </div>
          <div>
            <textarea 
              value={inputConfig}
              onChange={(e) => setInputConfig(e.target.value)}
              className="w-full h-48 bg-slate-900 border border-slate-600 rounded-lg p-4 font-mono text-xs text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  ...\n};`}
            />
            {error && <p className="text-red-400 text-sm mt-2 flex items-center gap-1"><AlertCircle size={14}/> {error}</p>}
          </div>
          <button onClick={handleSaveConfig} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg flex justify-center items-center gap-2">
            <Database size={20} /> 儲存並連線
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 獨立元件：收銀前台 (POS) ---
const PosInterface = ({ products, categories, addToCart, cart, updateQty, totalAmount, handleCheckout, loading, storeName, showAlert }) => {
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 結帳相關狀態
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 16));
  const [discount, setDiscount] = useState(''); 
  const [paymentMethod, setPaymentMethod] = useState('現金');
  const [note, setNote] = useState('');

  const displayCategories = useMemo(() => [
    { id: 'all', name: '全部商品', icon: 'ShoppingBag' },
    ...categories 
  ], [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategoryId === 'all' || p.categoryId === activeCategoryId;
      const matchesSearch = p.name.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategoryId, searchQuery, products]);

  // 計算最終金額
  const discountAmount = Number(discount) || 0;
  const finalTotal = Math.max(0, totalAmount - discountAmount);

  const handleCheckoutClick = () => {
    const dateToUse = isCustomDate ? customDate : null;
    handleCheckout({
      customDate: dateToUse,
      discount: discountAmount,
      paymentMethod,
      note
    });
    // 重置本地狀態
    setDiscount('');
    setPaymentMethod('現金');
    setNote('');
    setIsCustomDate(false);
  };

  const paymentOptions = ['現金', 'LinePay', '信用卡', '其他'];

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-slate-100">
      {/* 左側：商品選擇 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white p-2 md:p-4 shadow-sm z-10">
          <div className="flex justify-between items-center mb-2 md:mb-4">
            <div className="flex flex-col">
              <h2 className="text-lg md:text-xl font-bold text-slate-700">結帳</h2>
              <span className="text-[10px] md:text-xs text-indigo-500 font-medium flex items-center gap-1">
                <MapPin size={10} /> {storeName}
              </span>
            </div>
            <div className="relative w-40 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="搜尋..." 
                className="w-full pl-9 pr-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {displayCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap transition-all text-xs md:text-sm ${
                  activeCategoryId === cat.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {getIconComponent(cat.icon, 14)}
                {cat.name}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2 md:p-4">
          {loading ? (
             <div className="flex justify-center items-center h-full text-slate-400 text-sm">
                <RefreshCw className="animate-spin mr-2" size={18} /> 載入中...
             </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Package size={40} className="mb-2 opacity-20" />
              <p className="text-xs">無商品</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md cursor-pointer border border-transparent hover:border-indigo-200 transition-all flex flex-col overflow-hidden group"
                >
                  <div className="h-24 md:h-40 w-full bg-slate-200 overflow-hidden relative">
                    <ProductImage 
                      src={product.image} 
                      alt={product.name} 
                      className="group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <div className="p-2 text-center">
                    <h3 className="font-semibold text-slate-800 mb-0.5 text-xs md:text-base truncate">{product.name}</h3>
                    <p className="text-indigo-600 font-bold text-xs md:text-sm">${product.price}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 右側：購物車 */}
      <aside className="w-full md:w-96 bg-white shadow-2xl flex flex-col z-20 border-l border-slate-200 h-1/2 md:h-auto border-t md:border-t-0">
        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <h2 className="text-base md:text-lg font-bold text-slate-700 flex items-center gap-2">
            <Receipt size={18} /> 訂單
          </h2>
          <span className="bg-indigo-200 text-indigo-800 text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium">
            {cart.reduce((sum, item) => sum + item.qty, 0)} 項
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <ShoppingBag size={48} className="mb-2 text-slate-300" />
              <p className="text-xs">空的</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800 text-xs md:text-sm truncate">{item.name}</h4>
                  <div className="text-[10px] md:text-xs text-slate-500">${item.price}</div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:text-red-500"><Minus size={14} /></button>
                  <span className="w-4 text-center font-medium text-xs">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:text-green-600"><Plus size={14} /></button>
                </div>
                <div className="w-12 text-right font-bold text-slate-700 text-xs md:text-sm">${item.price * item.qty}</div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          {/* 折扣區塊 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Scissors size={12} /> 折扣
            </span>
            <input 
              type="number" 
              placeholder="0" 
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-20 text-right border border-slate-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-red-500"
            />
          </div>

          {/* 付款方式區塊 */}
          <div>
            <div className="grid grid-cols-4 gap-1 mb-1">
              {paymentOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setPaymentMethod(opt)}
                  className={`text-[10px] py-1 rounded border transition-all ${
                    paymentMethod === opt 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              placeholder="備註"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 bg-white"
            />
          </div>

          {/* 補登日期開關 */}
          <div>
            <div className="flex items-center gap-1 mb-1 px-1">
              <input 
                type="checkbox" 
                id="useCustomDate"
                checked={isCustomDate}
                onChange={(e) => setIsCustomDate(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3"
              />
              <label htmlFor="useCustomDate" className="text-[10px] text-slate-500 cursor-pointer select-none">
                補登日期
              </label>
            </div>
            {isCustomDate && (
              <div className="flex items-center gap-2 mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                 <input 
                   type="datetime-local" 
                   value={customDate}
                   onChange={(e) => setCustomDate(e.target.value)}
                   className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                 />
              </div>
            )}
          </div>

          {/* 金額計算 */}
          <div className="border-t border-slate-200 pt-1 space-y-0.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>小計</span>
              <span>${totalAmount}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-red-500 font-medium">
                <span>折扣</span>
                <span>-${discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between text-lg md:text-xl font-bold text-indigo-600 pt-1">
              <span>總金額</span>
              <span>${finalTotal}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckoutClick}
            disabled={cart.length === 0}
            className={`w-full py-2.5 rounded-lg font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all ${
              cart.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <CreditCard size={18} /> {isCustomDate ? '補登' : '結帳'}
          </button>
        </div>
      </aside>
    </div>
  );
};

// --- SettingsManager ---
const SettingsManager = ({ storeName, setStoreName, user, showAlert, showConfirm }) => {
  const [tempName, setTempName] = useState(storeName);
  const [diagStatus, setDiagStatus] = useState(null);
  
  const handleSave = () => {
    setStoreName(tempName);
    localStorage.setItem('pos_store_name', tempName);
    showAlert('店舖名稱已儲存！');
  };

  const handleResetSystem = () => {
    showConfirm('確定要清除設定並登出嗎？\n這將會移除資料庫連結設定，您需要重新輸入 Firebase Config。', () => {
      localStorage.removeItem('pos_firebase_config');
      window.location.reload();
    });
  };

  const runDiagnosis = async () => {
    setDiagStatus('running');
    try {
      if (!user) throw new Error("使用者未登入");
      const testRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'diagnostics'));
      await setDoc(testRef, { test: true, time: new Date().toISOString() });
      await deleteDoc(testRef);
      showAlert("診斷成功！系統運作正常。");
      setDiagStatus('success');
    } catch (e) {
      showAlert(`診斷失敗: ${e.message}`);
      setDiagStatus('error');
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-100 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings className="text-indigo-600" /> 系統設定</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 space-y-6">
          <div><h3 className="text-base md:text-lg font-bold text-slate-700 mb-2 flex items-center gap-2"><Store size={18} /> 本機店舖識別</h3><div className="flex gap-2"><input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="請輸入店舖名稱" /><button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm whitespace-nowrap"><Save size={16} /> 儲存</button></div></div>
          <div className="pt-4 border-t border-slate-100"><h3 className="text-base md:text-lg font-bold text-slate-700 mb-2 flex items-center gap-2"><Activity size={18} /> 系統診斷</h3><button onClick={runDiagnosis} className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 flex items-center gap-2 text-sm">{diagStatus === 'running' ? <RefreshCw className="animate-spin" size={16}/> : <Activity size={16}/>} 執行診斷</button></div>
          <div className="pt-4 border-t border-slate-100"><h3 className="text-base md:text-lg font-bold text-slate-700 mb-2 flex items-center gap-2"><Database size={18} /> 連線管理</h3><div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg"><span className="text-xs md:text-sm text-green-600 font-bold flex items-center gap-1"><CheckCircle size={14} /> 已連線</span><button onClick={handleResetSystem} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-2"><LogOut size={14} /> 清除設定</button></div></div>
        </div>
      </div>
    </div>
  );
};

// --- CategoryManager ---
const CategoryManager = ({ categories, onAddCategory, onUpdateCategory, onDeleteCategory, onMoveCategory, showConfirm }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: 'Tag' });
  const availableIcons = Object.keys(ICON_MAP);
  const openAddModal = () => { setFormData({ name: '', icon: 'Tag' }); setCurrentCategory(null); setIsEditing(true); };
  const openEditModal = (cat) => { setFormData({ name: cat.name, icon: cat.icon }); setCurrentCategory(cat); setIsEditing(true); };
  const handleSubmit = async (e) => { e.preventDefault(); try { if (currentCategory) await onUpdateCategory(currentCategory.id, formData); else await onAddCategory(formData); setIsEditing(false); } catch (e) {} };
  const handleDelete = (id) => { showConfirm('確定要刪除這個分類嗎？', async () => await onDeleteCategory(id)); };
  return (
    <div className="p-4 md:p-6 bg-slate-100 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4"><h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2"><Tag className="text-indigo-600" /> 分類管理</h2><button onClick={openAddModal} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-sm"><PlusCircle size={16} /> 新增分類</button></div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left text-xs md:text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-3 w-16 text-center">排序</th><th className="p-3 w-16 text-center">圖示</th><th className="p-3">分類名稱</th><th className="p-3 text-right w-24">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{categories.map((cat, idx) => (<tr key={cat.id} className="hover:bg-slate-50"><td className="p-3 text-center"><div className="flex flex-col items-center gap-1">{idx > 0 && <button onClick={() => onMoveCategory(cat.id, 'up')} className="p-1 hover:bg-slate-200"><ArrowUp size={12}/></button>}{idx < categories.length - 1 && <button onClick={() => onMoveCategory(cat.id, 'down')} className="p-1 hover:bg-slate-200"><ArrowDown size={12}/></button>}</div></td><td className="p-3 text-center text-indigo-600"><div className="flex justify-center">{getIconComponent(cat.icon)}</div></td><td className="p-3 font-medium">{cat.name}</td><td className="p-3 flex justify-end gap-2"><button onClick={() => openEditModal(cat)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={16} /></button><button onClick={() => handleDelete(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>
      </div>
      {isEditing && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white w-full max-w-md rounded-2xl p-6"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold">{currentCategory ? '編輯分類' : '新增分類'}</h3><button onClick={() => setIsEditing(false)}><X size={20}/></button></div><form onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-xs font-medium mb-1">分類名稱</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"/></div><div><label className="block text-xs font-medium mb-2">圖示</label><div className="grid grid-cols-6 gap-2 bg-slate-50 p-2 rounded-lg border h-32 overflow-y-auto">{availableIcons.map(iconName => (<button key={iconName} type="button" onClick={() => setFormData({...formData, icon: iconName})} className={`p-2 rounded-lg flex justify-center ${formData.icon === iconName ? 'bg-indigo-600 text-white' : 'hover:bg-white'}`}>{getIconComponent(iconName)}</button>))}</div></div><div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-100 rounded-lg text-sm">取消</button><button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">儲存</button></div></form></div></div>)}
    </div>
  );
};

// --- ProductManager ---
const ProductManager = ({ products, categories, onAddProduct, onUpdateProduct, onDeleteProduct, initDatabase, showAlert, showConfirm }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', categoryId: '', image: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const openAddModal = () => { const defaultCat = categories.length > 0 ? categories[0].id : ''; setFormData({ name: '', price: '', categoryId: defaultCat, image: '' }); setCurrentProduct(null); setIsEditing(true); };
  const openEditModal = (product) => { setFormData({ name: product.name, price: product.price, categoryId: product.categoryId || '', image: product.image || '' }); setCurrentProduct(product); setIsEditing(true); };
  const handleSubmit = async (e) => { e.preventDefault(); const payload = { ...formData, price: Number(formData.price) }; try { if (currentProduct) await onUpdateProduct(currentProduct.id, payload); else await onAddProduct(payload); setIsEditing(false); } catch (e) {} };
  const handleDelete = (id) => { showConfirm('確定要刪除這個商品嗎？', async () => await onDeleteProduct(id)); };
  const handleFileChange = async (e) => { const file = e.target.files[0]; if (!file) return; setIsProcessing(true); try { const base64Image = await resizeImage(file); setFormData(prev => ({ ...prev, image: base64Image })); } catch (error) { showAlert("圖片處理失敗"); } finally { setIsProcessing(false); } };
  const getCategoryName = (catId) => { const cat = categories.find(c => c.id === catId); return cat ? cat.name : '未分類'; };
  return (
    <div className="p-4 md:p-6 bg-slate-100 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4"><h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-indigo-600" /> 商品管理</h2><div className="flex gap-2">{products.length === 0 && <button onClick={initDatabase} className="flex items-center gap-2 bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-200 font-medium text-xs"><AlertCircle size={14} /> 載入範例</button>}<button onClick={openAddModal} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 shadow-md text-xs"><PlusCircle size={14} /> 新增</button></div></div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left text-xs md:text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-3 w-16">圖片</th><th className="p-3">名稱</th><th className="p-3">分類</th><th className="p-3 text-right">價格</th><th className="p-3 text-center">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => (<tr key={product.id} className="hover:bg-slate-50 group"><td className="p-2"><div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200"><ProductImage src={product.image} alt={product.name} /></div></td><td className="p-3 font-medium text-slate-700">{product.name}</td><td className="p-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">{getCategoryName(product.categoryId)}</span></td><td className="p-3 text-right font-mono text-slate-600">${product.price}</td><td className="p-3 flex justify-center gap-2"><button onClick={() => openEditModal(product)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={16} /></button><button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>
      </div>
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-800">{currentProduct ? '編輯商品' : '新增商品'}</h3><button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div><form onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-xs font-medium text-slate-700 mb-1">商品名稱</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-slate-700 mb-1">價格</label><input type="number" required min="0" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div><div><label className="block text-xs font-medium text-slate-700 mb-1">分類</label><select value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"><option value="" disabled>請選擇分類</option>{categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div></div><div><label className="block text-xs font-medium text-slate-700 mb-1">商品圖片</label><div className="flex gap-4"><div className="w-20 h-20 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 relative group">{isProcessing ? <div className="w-full h-full flex items-center justify-center"><RefreshCw className="animate-spin" size={20} /></div> : formData.image ? <ProductImage src={formData.image} alt="預覽" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><ImageIcon size={20}/><span className="text-[10px]">無圖片</span></div>}</div><div className="flex-1 space-y-2"><div className="flex gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs border border-slate-300" disabled={isProcessing}><Camera size={14} /> 上傳</button><input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} /></div><input type="url" value={formData.image && formData.image.startsWith('http') ? formData.image : ''} onChange={(e) => setFormData({...formData, image: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs placeholder:text-slate-300" placeholder="https://..." /></div></div></div><div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm">取消</button><button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-sm" disabled={isProcessing}>{isProcessing ? '處理中...' : '儲存'}</button></div></form></div></div>
      )}
    </div>
  );
};

// --- Dashboard ---
const Dashboard = ({ orders, products, categories, loading, onUpdateOrder, onDeleteOrder, onManualAddOrder, onExportData, onImportData, showConfirm }) => {
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all'); 
  const [editingOrder, setEditingOrder] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ date: new Date().toISOString().slice(0, 16), desc: '補登營收', amount: '' });
  const fileInputRef = useRef(null);

  const openEditOrderModal = (order) => {
    setEditingOrder(JSON.parse(JSON.stringify(order)));
  };

  const availableYears = useMemo(() => { const years = new Set([new Date().getFullYear().toString()]); orders.forEach(o => years.add(new Date(o.createdAt).getFullYear().toString())); return Array.from(years).sort((a, b) => b - a); }, [orders]);
  const availableStores = useMemo(() => { const stores = new Set(); orders.forEach(o => { if (o.storeName) stores.add(o.storeName); }); return Array.from(stores).sort(); }, [orders]);
  const availablePaymentMethods = ['all', '現金', 'LinePay', '信用卡', '其他'];

  const filteredOrders = useMemo(() => orders.filter(o => { 
    if (selectedStore !== 'all' && o.storeName !== selectedStore) return false; 
    const pm = o.paymentMethod || '現金'; 
    if (selectedPaymentMethod !== 'all' && pm !== selectedPaymentMethod) return false;

    const d = new Date(o.createdAt); 
    if (reportType === 'daily') return d.toLocaleDateString() === new Date(selectedDate).toLocaleDateString(); 
    if (reportType === 'monthly') return o.createdAt.slice(0, 7) === selectedMonth; 
    if (reportType === 'yearly') return d.getFullYear().toString() === selectedYear; 
    return false; 
  }), [orders, reportType, selectedDate, selectedMonth, selectedYear, selectedStore, selectedPaymentMethod]);
  
  const stats = useMemo(() => {
    const filteredTotal = orders.filter(o => {
      if (selectedStore !== 'all' && o.storeName !== selectedStore) return false;
      const pm = o.paymentMethod || '現金';
      if (selectedPaymentMethod !== 'all' && pm !== selectedPaymentMethod) return false;
      return true;
    });

    const totalSales = filteredTotal.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = filteredTotal.length;
    
    const periodSales = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const productSales = {}; 
    filteredOrders.forEach(order => { 
      order.items.forEach(item => { 
        if (!productSales[item.name]) productSales[item.name] = 0; 
        productSales[item.name] += item.qty; 
      }); 
    });
    const topProducts = Object.entries(productSales).sort(([,a], [,b]) => b - a);
    
    return { totalSales, totalOrders, periodSales, topProducts };
  }, [orders, filteredOrders, selectedStore, selectedPaymentMethod]);

  const sortedFilteredOrders = useMemo(() => [...filteredOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [filteredOrders]);
  
  const handleManualSubmit = (e) => { e.preventDefault(); if (!manualForm.amount || !manualForm.date) return; onManualAddOrder({ items: [{ name: manualForm.desc, price: Number(manualForm.amount), qty: 1, id: 'manual-' + Date.now() }], total: Number(manualForm.amount), createdAt: new Date(manualForm.date).toISOString() }); setShowManualEntry(false); };
  const updateEditItemQty = (index, delta) => { setEditingOrder(prev => { const newItems = [...prev.items]; const item = newItems[index]; item.qty = Math.max(0, item.qty + delta); if (item.qty === 0) newItems.splice(index, 1); const subtotal = newItems.reduce((sum, i) => sum + (i.price * i.qty), 0); const final = Math.max(0, subtotal - (prev.discount || 0)); return { ...prev, items: newItems, subtotal, total: final }; }); };
  const handleSaveEdit = async () => { if (!editingOrder) return; await onUpdateOrder(editingOrder.id, { items: editingOrder.items, total: editingOrder.total, subtotal: editingOrder.subtotal }); setEditingOrder(null); };
  const handleDelete = (id) => { showConfirm('確定要刪除?', async () => await onDeleteOrder(id)); };

  const triggerImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImportData(file);
    }
    e.target.value = null; // Reset
  };

  return (
    <div className="p-4 md:p-6 bg-slate-100 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">營運報表中心</h2>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setShowManualEntry(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm"><CalendarPlus size={16} /> 補登</button>
            <div className="flex items-center bg-white px-2 py-1.5 rounded-lg border border-slate-200"><Store size={16} className="text-indigo-600 mr-2" /><select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="outline-none text-slate-800 bg-transparent text-xs md:text-sm"><option value="all">全部店舖</option>{availableStores.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="flex items-center bg-white px-2 py-1.5 rounded-lg border border-slate-200"><Banknote size={16} className="text-indigo-600 mr-2" /><select value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className="outline-none text-slate-800 bg-transparent text-xs md:text-sm">{availablePaymentMethods.map(pm => <option key={pm} value={pm}>{pm === 'all' ? '全部付款' : pm}</option>)}</select></div>
            <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200">
               <div className="flex bg-slate-100 p-1 rounded mr-2"><button onClick={() => setReportType('daily')} className={`px-2 py-1 rounded text-xs ${reportType === 'daily' ? 'bg-white text-indigo-600' : 'text-slate-500'}`}>日</button><button onClick={() => setReportType('monthly')} className={`px-2 py-1 rounded text-xs ${reportType === 'monthly' ? 'bg-white text-indigo-600' : 'text-slate-500'}`}>月</button><button onClick={() => setReportType('yearly')} className={`px-2 py-1 rounded text-xs ${reportType === 'yearly' ? 'bg-white text-indigo-600' : 'text-slate-500'}`}>年</button></div>
               <div className="flex items-center gap-1 px-1">{reportType === 'daily' ? <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-xs"/> : reportType === 'monthly' ? <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-xs"/> : <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-xs">{availableYears.map(y => <option key={y} value={y}>{y} 年</option>)}</select>}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><p className="text-slate-500 text-xs">累積營業額</p><h3 className="text-xl font-bold">${stats.totalSales.toLocaleString()}</h3></div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><p className="text-slate-500 text-xs">累積訂單</p><h3 className="text-xl font-bold">{stats.totalOrders}</h3></div>
           <div className="bg-white p-4 rounded-xl border-l-4 border-l-amber-400"><p className="text-slate-500 text-xs">期間營收</p><h3 className="text-xl font-bold">${stats.periodSales.toLocaleString()}</h3></div>
        </div>
        <div className="mb-6 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white"><div className="flex justify-between items-center"><h3 className="text-sm font-bold">資料備份</h3><div className="flex gap-2"><button onClick={onExportData} className="bg-white/10 px-3 py-1.5 rounded text-xs">匯出</button><button onClick={() => fileInputRef.current?.click()} className="bg-sky-500 px-3 py-1.5 rounded text-xs">匯入</button><input type="file" ref={fileInputRef} onChange={triggerImport} className="hidden" /></div></div></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm lg:col-span-1 flex flex-col max-h-[600px]">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2 flex-shrink-0"><Package size={18} className="text-indigo-500"/> 商品排行 ({reportType === 'daily' ? '當日' : reportType === 'monthly' ? '當月' : '當年'})</h3>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {stats.topProducts.length > 0 ? stats.topProducts.map(([name, qty], idx) => (
                <div key={name} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
                    <span className="truncate text-slate-700">{name}</span>
                  </div>
                  <span className="text-slate-500 text-xs whitespace-nowrap">{qty} 份</span>
                </div>
              )) : <div className="text-center py-4 text-slate-400 text-xs">無數據</div>}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm lg:col-span-2"><h3 className="font-bold text-base mb-3">訂單紀錄</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="pb-2">時間</th><th className="pb-2">店舖</th><th className="pb-2">付款</th><th className="pb-2 text-right">金額</th><th className="pb-2 text-center">操作</th></tr></thead><tbody>{sortedFilteredOrders.map(o => (<tr key={o.id} className="border-b"><td className="py-2">{new Date(o.createdAt).toLocaleString()}</td><td className="py-2">{o.storeName}</td><td className="py-2">{o.paymentMethod}</td><td className="py-2 text-right">${o.total}</td><td className="py-2 text-center"><button onClick={()=>openEditOrderModal(o)} className="text-indigo-600 mr-2"><Edit size={14}/></button><button onClick={()=>handleDelete(o.id)} className="text-red-600"><Trash2 size={14}/></button></td></tr>))}</tbody></table></div></div>
        </div>
      </div>
      {showManualEntry && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h3 className="text-lg font-bold mb-4">補登訂單</h3><form onSubmit={handleManualSubmit} className="space-y-3"><input type="datetime-local" className="w-full border p-2 rounded text-sm" value={manualForm.date} onChange={e=>setManualForm({...manualForm, date:e.target.value})}/><input type="text" className="w-full border p-2 rounded text-sm" placeholder="說明" value={manualForm.desc} onChange={e=>setManualForm({...manualForm, desc:e.target.value})}/><input type="number" className="w-full border p-2 rounded text-sm" placeholder="金額" value={manualForm.amount} onChange={e=>setManualForm({...manualForm, amount:e.target.value})}/><div className="flex gap-2"><button type="button" onClick={()=>setShowManualEntry(false)} className="flex-1 bg-gray-100 p-2 rounded text-sm">取消</button><button type="submit" className="flex-1 bg-emerald-500 text-white p-2 rounded text-sm">確認</button></div></form></div></div>}
      {editingOrder && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h3 className="text-lg font-bold mb-4">編輯訂單</h3><div className="max-h-60 overflow-y-auto space-y-2 mb-4">{editingOrder.items.map((item, i) => <div key={i} className="flex justify-between items-center border p-2 rounded text-sm"><span>{item.name}</span><div className="flex items-center gap-2"><button onClick={()=>updateEditItemQty(i, -1)}>-</button><span>{item.qty}</span><button onClick={()=>updateEditItemQty(i, 1)}>+</button></div></div>)}</div><div className="flex justify-between font-bold text-sm mb-4"><span>總計</span><span>${editingOrder.total}</span></div><div className="flex gap-2"><button onClick={()=>setEditingOrder(null)} className="flex-1 bg-gray-100 p-2 rounded text-sm">取消</button><button onClick={handleSaveEdit} className="flex-1 bg-indigo-600 text-white p-2 rounded text-sm">儲存</button></div></div></div>}
    </div>
  );
};

// --- 主程式 ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('pos'); 
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState(() => localStorage.getItem('pos_store_name') || '本店');

  // --- 自訂 Modal 狀態，取代原生的 window.alert 和 window.confirm ---
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });
  const showAlert = (message) => setDialog({ isOpen: true, type: 'alert', message, onConfirm: null });
  const showConfirm = (message, onConfirm) => setDialog({ isOpen: true, type: 'confirm', message, onConfirm });
  const closeDialog = () => setDialog({ isOpen: false, type: 'alert', message: '', onConfirm: null });

  if (!isConfigured) {
    return <SetupScreen />;
  }

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const prodRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const catRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
    const orderRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubProd = onSnapshot(prodRef, (snapshot) => { setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(false); }, console.error);
    const unsubCat = onSnapshot(catRef, (snapshot) => { setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))); }, console.error);
    const unsubOrder = onSnapshot(orderRef, (snapshot) => { setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); }, console.error);
    return () => { unsubProd(); unsubCat(); unsubOrder(); };
  }, [user]);

  // --- 初始化資料庫 ---
  const initializeDatabase = async () => {
    if (!user) return;
    
    const doInit = async () => {
      const batch = writeBatch(db);
      
      // 建立分類
      const catRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
      const catIdMap = {}; 

      for (const cat of INITIAL_CATEGORIES) {
        const newCatDoc = doc(catRef);
        batch.set(newCatDoc, cat);
        catIdMap[cat.name] = newCatDoc.id;
      }

      // 建立商品
      const prodRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
      INITIAL_PRODUCTS.forEach(item => {
        const newDoc = doc(prodRef);
        const { categoryName, ...rest } = item;
        const categoryId = catIdMap[categoryName] || '';
        batch.set(newDoc, { ...rest, categoryId });
      });

      try {
        await batch.commit();
        showAlert('資料庫初始化成功！');
      } catch (e) {
        console.error(e);
        showAlert('初始化失敗：' + e.message);
      }
    };

    if (products.length > 0) {
        showConfirm('資料庫已有資料，確定要匯入範例資料嗎？這可能會造成重複。', doInit);
    } else {
        doInit();
    }
  };

  const handleAddCategory = async (data) => { if(!user) return; try{ await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'categories'), {...data, sortOrder: categories.length+1}); } catch(e){} };
  const handleUpdateCategory = async (id, data) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'categories', id), data);
  const handleDeleteCategory = async (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'categories', id));
  const handleMoveCategory = async (id, direction) => {
    if (!user) return;
    const sortedCats = [...categories];
    const currentIndex = sortedCats.findIndex(c => c.id === id);
    if (currentIndex === -1) return;
    let targetIndex = -1;
    if (direction === 'up' && currentIndex > 0) targetIndex = currentIndex - 1;
    else if (direction === 'down' && currentIndex < sortedCats.length - 1) targetIndex = currentIndex + 1;
    if (targetIndex !== -1) {
      const currentCat = sortedCats[currentIndex];
      const targetCat = sortedCats[targetIndex];
      let currentOrder = currentCat.sortOrder ?? currentIndex;
      let targetOrder = targetCat.sortOrder ?? targetIndex;
      if (currentOrder === targetOrder) { currentOrder = currentIndex; targetOrder = targetIndex; }
      const batch = writeBatch(db);
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'categories', currentCat.id), { sortOrder: targetOrder });
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'categories', targetCat.id), { sortOrder: currentOrder });
      await batch.commit();
    }
  };
  
  const handleAddProduct = async (data) => { if(!user) return; try{ await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), data); } catch(e){} };
  const handleUpdateProduct = async (id, data) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), data);
  const handleDeleteProduct = async (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
  
  const handleUpdateOrder = async (id, data) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', id), data);
  const handleDeleteOrder = async (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', id));
  
  const handleCheckout = async (checkoutData = {}) => {
    if (!user || cart.length === 0) return;
    const { customDate = null, discount = 0, paymentMethod = '現金', note = '' } = checkoutData;
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const finalTotal = Math.max(0, subtotal - discount);

    const orderData = { 
      items: cart, 
      subtotal: subtotal, 
      discount: discount, 
      total: finalTotal,  
      paymentMethod: paymentMethod, 
      note: note, 
      createdAt: customDate ? new Date(customDate).toISOString() : new Date().toISOString(), 
      creatorId: user.uid,
      storeName: storeName 
    };

    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderData);
      setLastOrder({ id: docRef.id, ...orderData });
      setShowReceipt(true);
      setCart([]);
    } catch (e) { showAlert("結帳失敗: " + e.message); }
  };

  const handleManualAddOrder = async (data) => { try{ await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {...data, creatorId: user.uid, storeName}); showAlert("成功"); } catch(e){} };
  
  // --- 匯出功能 ---
  const handleExportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      products,
      categories,
      orders
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pos_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 匯入功能 ---
  const handleImportData = async (file) => {
    if (!user || !file) return;
    
    showConfirm('警告：匯入資料將會覆蓋或合併現有資料。建議先進行備份。\n確定要繼續嗎？', () => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            const batch = writeBatch(db);
            let count = 0;

            if (data.categories) {
              data.categories.forEach(cat => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'categories', cat.id);
                batch.set(ref, cat);
                count++;
              });
            }

            if (data.products) {
              data.products.forEach(prod => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', prod.id);
                batch.set(ref, prod);
                count++;
              });
            }

            if (data.orders) {
              data.orders.forEach(order => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                batch.set(ref, order);
                count++;
              });
            }

            await batch.commit();
            showAlert(`成功匯入 ${count} 筆資料！\n請重新整理頁面以確保資料顯示正確。`);
          } catch (err) {
            console.error("Import failed:", err);
            showAlert("匯入失敗，請檢查檔案格式是否正確。");
          }
        };
        reader.readAsText(file);
    });
  };

  const addToCart = (p) => setCart(prev => { const ex = prev.find(i=>i.id===p.id); return ex ? prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...prev,{...p,qty:1}]; });
  const updateQty = (id, d) => setCart(prev => prev.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0));

  return (
    <div className="flex h-screen bg-slate-200 font-sans text-slate-800 relative">
      <nav className="w-16 md:w-20 bg-slate-900 flex flex-col items-center py-4 md:py-6 gap-4 md:gap-6 z-30 shadow-xl flex-shrink-0">
        <div className="bg-indigo-600 p-2 rounded-lg mb-2"><ShoppingBag className="text-white" size={20} /></div>
        <NavButton icon={Store} label="收銀台" view="pos" current={currentView} setView={setCurrentView} />
        <NavButton icon={Package} label="商品" view="products" current={currentView} setView={setCurrentView} />
        <NavButton icon={Tag} label="分類" view="categories" current={currentView} setView={setCurrentView} />
        <NavButton icon={LayoutDashboard} label="報表" view="dashboard" current={currentView} setView={setCurrentView} />
        <div className="mt-auto"><NavButton icon={Settings} label="設定" view="settings" current={currentView} setView={setCurrentView} /></div>
      </nav>
      
      <div className="flex-1 overflow-hidden relative">
        {currentView === 'pos' && <PosInterface products={products} categories={categories} addToCart={addToCart} cart={cart} updateQty={updateQty} totalAmount={cart.reduce((s,i)=>s+i.price*i.qty,0)} handleCheckout={handleCheckout} loading={loading} storeName={storeName} showAlert={showAlert} />}
        {currentView === 'products' && <ProductManager products={products} categories={categories} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} initDatabase={initializeDatabase} showAlert={showAlert} showConfirm={showConfirm} />}
        {currentView === 'categories' && <CategoryManager categories={categories} onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onMoveCategory={handleMoveCategory} showConfirm={showConfirm} />}
        {currentView === 'dashboard' && <Dashboard orders={orders} products={products} categories={categories} loading={loading} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} onManualAddOrder={handleManualAddOrder} onExportData={handleExportData} onImportData={handleImportData} showConfirm={showConfirm} />}
        {currentView === 'settings' && <SettingsManager storeName={storeName} setStoreName={setStoreName} user={user} showAlert={showAlert} showConfirm={showConfirm} />}
      </div>

      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-80 text-sm shadow-2xl">
            <div className="text-center border-b pb-4 mb-4">
              <h3 className="text-xl font-bold mb-1">CloudPOS</h3>
              <p className="text-slate-500">{new Date(lastOrder.createdAt).toLocaleString()}</p>
              <div className="mt-2 flex justify-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">{lastOrder.storeName || '本店'}</span>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs">{lastOrder.paymentMethod}</span>
              </div>
            </div>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {lastOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.name} x{item.qty}</span>
                  <span>${item.price * item.qty}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-slate-500"><span>小計</span><span>${lastOrder.subtotal}</span></div>
              {lastOrder.discount > 0 && <div className="flex justify-between text-red-500"><span>折扣</span><span>-${lastOrder.discount}</span></div>}
              <div className="flex justify-between text-xl font-bold mt-2"><span>總金額</span><span>${lastOrder.total}</span></div>
            </div>
            {lastOrder.note && <div className="mt-4 bg-slate-50 p-2 rounded text-slate-600 text-xs">備註：{lastOrder.note}</div>}
            <button onClick={()=>setShowReceipt(false)} className="mt-6 w-full bg-slate-800 text-white py-3 rounded-lg font-bold">關閉 / 下一位</button>
          </div>
        </div>
      )}

      {/* --- 共用對話框 --- */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-3 text-slate-800">
              {dialog.type === 'confirm' ? '請確認' : '系統提示'}
            </h3>
            <p className="text-slate-600 mb-6 whitespace-pre-line text-sm">{dialog.message}</p>
            <div className="flex gap-3 justify-end">
              {dialog.type === 'confirm' && (
                <button 
                  onClick={closeDialog} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
                >
                  取消
                </button>
              )}
              <button 
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  closeDialog();
                }} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const NavButton = ({ icon: Icon, label, view, current, setView }) => (
  <button onClick={() => setView(view)} className={`p-2 md:p-3 rounded-xl transition-all group relative ${current === view ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    <Icon size={20} />
    <span className="absolute left-12 md:left-14 bg-slate-800 text-white text-[10px] md:text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">{label}</span>
  </button>
);