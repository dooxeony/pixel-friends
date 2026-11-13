# 우리, 만났어! 💗

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

