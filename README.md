# 우리, 만났어! 💗

## 추가 사항: 실제 NU40-DK BLE 연결 1단계

원본 화면·캐릭터 선택·체험 모드는 유지했습니다. 이번 사본에만 다음을 추가했습니다.

- `ble-web.js`: 맥북 Chrome에서 **실제 보드 연결** 버튼, 연결 상태 및 보드 응답 표시
- `NU40_DK_BLE_Web/NU40_DK_BLE_Web.ino`: 기존 GC9A01/RGB 핀을 유지하고 Nordic UART BLE 서비스를 추가한 테스트용 펌웨어
- `index.html`: 새 BLE 스크립트 로드

### 테스트 순서

1. Arduino IDE에서 `NU40_DK_BLE_Web.ino`를 **각 NU40-DK 보드에 업로드**합니다. 먼저 코드 컴파일을 확인해 주세요.
2. 이 웹 폴더를 GitHub Pages 등 **HTTPS 주소**에 배포하고 **맥북 Chrome**에서 엽니다. `file://` 페이지에서는 연결할 수 없습니다.
3. '시작하기' → 기기 연결 화면의 **블루투스로 기기 연결하기**를 누르거나, 기존 프로필이 있다면 '마이'에서 같은 버튼을 누릅니다.
4. 목록에서 `PIXEL_FRIEND`를 선택합니다. 연결되면 `NU40-DK READY` 응답을 표시합니다.
5. 아이폰 Safari에서는 직접 BLE 연결할 수 없습니다. 기존 UI는 계속 볼 수 있습니다.

### 아직 구현하지 않은 기능

- 친구의 고유 ID 교환, 버튼을 통한 양쪽 승인 및 실제 친구 추가
- 만남 시간/위치의 영구 보관 및 서버 동기화
- 아이폰과 맥북 사이의 프로필 공유 (현재 프로필은 브라우저 `localStorage`에만 저장됨)

**주의:** 웹의 '체험 모드로 연결하기'는 기존 그대로 가상 동작입니다. 실제 연결 확인은 별도의 블루투스 버튼을 사용하세요. 같은 이름의 보드가 둘 이상 있다면 기기 선택 창에서 구분하기 어렵습니다. 이번 단계는 연결 확인용이며 사용자별 기기 등록/소유 인증은 아직 아닙니다.

---

NU40-DK 보드를 활용한 픽셀 캐릭터 친구 교류 서비스의 **모바일 웹 UI 프로토타입**입니다.

## 바로 실행하기

1. 압축을 풀고 `index.html`을 브라우저에서 엽니다.
2. 또는 VS Code에서 폴더를 열고 **Live Server** 확장 프로그램으로 `index.html`을 실행합니다.
3. 휴대폰 화면을 확인하려면 Chrome 개발자 도구의 기기 모드를 사용하거나 GitHub Pages로 배포합니다.

빌드·설치 과정이 없는 순수 HTML/CSS/JavaScript 프로젝트입니다.

## 파일 구성

```text
pixel-friends-github/
├── index.html   # 화면의 기본 구조
├── style.css    # 파스텔 디자인, 반응형 레이아웃
├── script.js    # 화면 전환, 캐릭터 생성, 사진 픽셀 변환, 저장
├── README.md    # 사용 방법
└── .gitignore
```

## 현재 가능한 기능

- 기기 연결 **체험 모드**
- 닉네임 입력 및 유효성 검사
- 기본 픽셀 캐릭터 5종 선택
- 이미지 업로드, 얼굴 위치 드래그, 확대/축소, 픽셀 변환
- 캐릭터 선택 및 마이페이지에서 변경
- 친구 목록, 만남 기록 화면 (현재 빈 상태)
- 브라우저 `localStorage`에 프로필 저장

> **중요:** BLE 실제 연결·소유 인증, 서버 회원가입, 친구 추가, 만남 기록 저장은 아직 구현되지 않았습니다. 현재 저장 데이터는 각 브라우저 안에만 보관됩니다. 사진 변환은 자동 얼굴 감지가 아닌 사용자 위치 조정 방식입니다.

## GitHub에 올리기

GitHub에서 빈 저장소를 새로 만든 뒤 이 폴더에서 아래 명령을 실행합니다.

```bash
git init
git add .
git commit -m "Initial mobile web prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

`YOUR_USERNAME`과 `YOUR_REPOSITORY`는 실제 GitHub 계정명과 저장소 이름으로 바꾸세요.

## GitHub Pages로 배포하기

저장소의 **Settings → Pages → Build and deployment**에서 **Deploy from a branch**, `main`, `/(root)`를 선택하고 저장합니다. 이후 HTML/CSS/JS를 수정해 `main`에 push하면 변경 사항이 배포됩니다.

기존 `chatgpt.site` 주소와 GitHub Pages 주소는 별개이며, GitHub에 push해도 기존 사이트가 자동 갱신되지는 않습니다.

## 향후 개발

- NU40-DK 펌웨어와 BLE 프로토콜 정의
- 서버 계정 및 기기 ID 연동
- 캐릭터 이미지의 서버 저장 및 보드 화면 전송
- 친구 요청 및 양쪽 승인 처리
- 만남 시간·위치 저장 (휴대폰 위치 권한 및 개인정보 동의 필요)

