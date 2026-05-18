// client/app.js
// 1. Supabase 접속 정보 및 클라이언트 초기화
const SUPABASE_URL = 'https://kddrukxtbnoezbiasqvn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJpbi0xMjMwLW5vZXJiaWFzcXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDMzNDUsImV4cCI6MjA2MjkxOTM0NX0.0y7-h_8_Lp0X_6G0Z5qQ-v_5z99t0SjQ9XUv5_5W1Q4';

// 변수명 충돌 방지를 위해 supabase -> sbClient로 변경
let sbClient = null;
try {
  if (typeof window.supabase === 'undefined') {
    throw new Error('Supabase 라이브러리를 불러오지 못했습니다.');
  }
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('Supabase Init Error:', err);
}

// 2. 상태 상수 및 변수 정의
const STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

let currentState = STATE.IDLE;
let currentUser = null;
let isSignUpMode = false;

// 3. DOM 요소 참조
const elLoginSection = document.getElementById('login-section');
const elMainSection = document.getElementById('main-section');
const elLoadingOverlay = document.getElementById('loading-overlay');
const elToastContainer = document.getElementById('toast-container');

const elAuthForm = document.getElementById('auth-form');
const elAuthTitle = document.getElementById('auth-title');
const elAuthSubmitBtn = document.getElementById('auth-submit-btn');
const elAuthError = document.getElementById('auth-error');
const elAuthToggleBtn = document.getElementById('auth-toggle-btn');
const elAuthToggleText = document.getElementById('auth-toggle-text');

const elUserEmail = document.getElementById('user-email');
const elLogoutBtn = document.getElementById('logout-btn');

// 3-1. UI 유틸리티 함수
function setLoading(isLoading) {
  if (isLoading) {
    elLoadingOverlay.classList.add('is-active');
    currentState = STATE.LOADING;
  } else {
    elLoadingOverlay.classList.remove('is-active');
    currentState = STATE.IDLE;
  }
}

/**
 * 사용자에게 알림 메시지를 표시합니다. (Toast 기능)
 */
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  elToastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function toggleScreens(isLoggedIn) {
  if (isLoggedIn) {
    elLoginSection.classList.remove('is-active');
    elMainSection.classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    elLoginSection.classList.add('is-active');
    elMainSection.classList.remove('is-active');
  }
}

// 4. 모드 전환 로직
elAuthToggleBtn.addEventListener('click', () => {
  isSignUpMode = !isSignUpMode;
  
  if (isSignUpMode) {
    elAuthTitle.textContent = '회원가입';
    elAuthSubmitBtn.textContent = '가입하기';
    elAuthToggleText.textContent = '이미 계정이 있으신가요?';
    elAuthToggleBtn.textContent = '로그인하기';
  } else {
    elAuthTitle.textContent = '로그인';
    elAuthSubmitBtn.textContent = '계속하기';
    elAuthToggleText.textContent = '계정이 없으신가요?';
    elAuthToggleBtn.textContent = '회원가입하기';
  }
  elAuthError.textContent = '';
});

// 5. 실제 인증 로직 (Supabase 연동)

async function checkSession() {
  if (!sbClient) return;
  setLoading(true);
  try {
    const { data: { session }, error } = await sbClient.auth.getSession();
    if (error) throw error;

    if (session) {
      currentUser = session.user;
      const elEmailDisplay = document.getElementById('user-email');
      if (elEmailDisplay) elEmailDisplay.textContent = currentUser.email;
      toggleScreens(true);
      showToast(`${currentUser.email}님, 환영합니다!`);
      loadHistory(); // 과거 기록 로드
    } else {
      currentUser = null;
      toggleScreens(false);
    }
  } catch (err) {
    console.error('Session Check Error:', err);
    toggleScreens(false);
  } finally {
    setLoading(false);
  }
}

elAuthForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!sbClient) return;

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  elAuthError.textContent = '';
  setLoading(true);

  try {
    if (isSignUpMode) {
      // 회원가입
      const { data, error } = await sbClient.auth.signUp({ 
        email, 
        password,
        options: {
          data: { full_name: email.split('@')[0] } 
        }
      });
      if (error) throw error;
      
      showToast('회원가입 성공! 이메일 인증을 확인하거나 로그인해 주세요.');
      isSignUpMode = false;
      elAuthToggleBtn.click();
    } else {
      // 로그인
      const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
      
      if (error) {
        // 회원 정보가 없는 경우 등 에러 처리 강화
        if (error.status === 400) {
          throw new Error('가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.');
        }
        throw error;
      }

      currentUser = data.user;
      toggleScreens(true);
      showToast('성공적으로 로그인되었습니다.');
      elAuthForm.reset();
      loadHistory(); // 로그인 성공 시 기록 로드
    }
  } catch (err) {
    console.error('Auth Error:', err);
    elAuthError.textContent = err.message;
    showToast(`오류: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

elLogoutBtn.addEventListener('click', async () => {
  if (!sbClient) return;
  setLoading(true);
  try {
    await sbClient.auth.signOut();
    currentUser = null;
    toggleScreens(false);
    elHistoryList.innerHTML = '';
    showToast('로그아웃되었습니다.');
  } catch (err) {
    console.error('Logout Error:', err);
  } finally {
    setLoading(false);
  }
});

/**
 * 사용자의 과거 분석 기록을 서버에서 가져와 렌더링합니다.
 */
async function loadHistory() {
  if (!currentUser) return;
  try {
    const response = await fetch(`/api/history/${currentUser.id}`);
    const data = await response.json();
    
    if (data.success) {
      elHistoryList.innerHTML = '';
      data.history.forEach(item => {
        // DB에서 가져온 복호화된 데이터를 렌더링 (input_text_dec 필드 사용)
        addHistoryItem(item.input_text_dec, item);
      });
    }
  } catch (err) {
    console.error('Load History Error:', err);
    showToast('분석 기록을 불러오지 못했습니다.');
  }
}

// 6. 결과 모달 및 히스토리 (실제 API 연동)
const elAnalyzeBtn = document.getElementById('analyze-btn');
const elAnalyzeText = document.getElementById('analyze-text');
const elAnalyzeError = document.getElementById('analyze-error');
const elResultModal = document.getElementById('result-modal');
const elHistoryList = document.getElementById('history-list');

elAnalyzeBtn.addEventListener('click', async () => {
  const text = elAnalyzeText.value.trim();
  if (!text) {
    elAnalyzeError.textContent = '분석할 내용을 입력해 주세요.';
    return;
  }
  
  if (!currentUser) {
    showToast('로그인이 필요합니다.');
    return;
  }

  elAnalyzeError.textContent = '';
  setLoading(true);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, userId: currentUser.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showResultModal(data.result);
      addHistoryItem(text, data.result);
      elAnalyzeText.value = '';
      showToast('감정 분석이 완료되었습니다.');
    } else {
      throw new Error(data.error || '분석 중 오류가 발생했습니다.');
    }
  } catch (err) {
    console.error('Analyze API Error:', err);
    elAnalyzeError.textContent = err.message;
    showToast(`오류: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

document.getElementById('close-modal-btn').addEventListener('click', () => {
  elResultModal.close();
});

function showResultModal(result) {
  document.getElementById('res-sentiment').textContent = result.sentiment;
  document.getElementById('res-confidence').textContent = result.confidence;
  document.getElementById('res-reason').textContent = result.reason;
  elResultModal.showModal();
}

function addHistoryItem(text, result) {
  const card = document.createElement('div');
  card.className = 'category-card';
  
  if (result.sentiment === '긍정') card.classList.add('positive');
  else if (result.sentiment === '부정') card.classList.add('negative');
  else card.classList.add('neutral');
  
  const timeStr = result.created_at ? new Date(result.created_at).toLocaleString() : new Date().toLocaleTimeString();
  
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <span class="eyebrow" style="color: inherit; opacity: 0.8; font-size: 12px;">감정 분석 인사이트</span>
      <span style="font-size: 12px; opacity: 0.6;">${timeStr}</span>
    </div>
    <h4 style="font-size: 20px; margin: 8px 0;">${result.sentiment} (${result.confidence}%)</h4>
    <p style="font-size: 14px; opacity: 0.9;">"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"</p>
  `;
  elHistoryList.prepend(card);
}

// 7. 앱 시작
checkSession();
