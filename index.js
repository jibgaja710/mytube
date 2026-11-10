const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MyTube</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #0f0f0f;
  color: white;
  font-family: Arial, sans-serif;
}
header {
  background: #181818;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 18px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.logo {
  color: #ff3333;
  font-size: 24px;
  font-weight: bold;
}
.search {
  display: flex;
  flex: 1;
  max-width: 650px;
  margin: auto;
}
input {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border: 1px solid #444;
  background: #222;
  color: white;
  font-size: 16px;
  border-radius: 8px 0 0 8px;
}
button {
  padding: 12px 18px;
  background: #333;
  color: white;
  border: 0;
  cursor: pointer;
  border-radius: 0 8px 8px 0;
}
main { padding: 20px; }
#videos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
.video {
  cursor: pointer;
  min-width: 0;
}
.video img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 10px;
}
.video h3 {
  font-size: 15px;
  margin: 9px 0;
  line-height: 1.4;
}
#player {
  display: none;
  margin-bottom: 25px;
}
#player iframe {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: 10px;
}
#player h2 { font-size: 20px; }
#status { color: #aaa; }
@media (max-width: 600px) {
  header { padding: 10px; gap: 10px; }
  .logo { font-size: 19px; }
  main { padding: 12px; }
}
</style>
</head>
<body>
<header>
  <div class="logo">▶ MyTube</div>
  <form class="search" id="searchForm">
    <input id="query" placeholder="YouTube 동영상 검색" required>
    <button type="submit">검색</button>
  </form>
</header>
<main>
  <section id="player">
    <iframe id="frame"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
    <h2 id="playingTitle"></h2>
    <h3>관련 동영상</h3>
  </section>
  <p id="status">검색어를 입력해 동영상을 찾아보세요.</p>
  <section id="videos"></section>
</main>
<script>
const form = document.getElementById("searchForm");
const queryInput = document.getElementById("query");
const videos = document.getElementById("videos");
const statusText = document.getElementById("status");
const player = document.getElementById("player");
const frame = document.getElementById("frame");
const playingTitle = document.getElementById("playingTitle");

let lastResults = [];

function showVideos(items) {
  lastResults = items;
  videos.innerHTML = "";

  if (!items.length) {
    statusText.textContent = "검색 결과가 없습니다.";
    return;
  }

  statusText.textContent = "검색 결과 " + items.length + "개";

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "video";

    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.alt = "";

    const title = document.createElement("h3");
    title.textContent = item.title;

    card.append(img, title);
    card.addEventListener("click", () => {
      player.style.display = "block";
      frame.src =
        "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(item.id) +
        "?autoplay=1";
      playingTitle.textContent = item.title;
      player.scrollIntoView({ behavior: "smooth" });
    });

    videos.appendChild(card);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = queryInput.value.trim();
  if (!query) return;

  statusText.textContent = "검색 중...";
  videos.innerHTML = "";
  player.style.display = "none";
  frame.src = "";

  try {
    const response = await fetch(
      "/api/search?q=" + encodeURIComponent(query)
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "검색에 실패했습니다.");
    }

    showVideos(data.items || []);
  } catch (error) {
    statusText.textContent = "오류: " + error.message;
  }
});
</script>
</body>
</html>
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=UTF-8"
        }
      });
    }

    if (url.pathname === "/api/search") {
      const query = url.searchParams.get("q");

      if (!query) {
        return Response.json(
          { error: "검색어를 입력해 주세요." },
          { status: 400 }
        );
      }

      if (!env.YOUTUBE_API_KEY) {
        return Response.json(
          { error: "YouTube API 키가 아직 설정되지 않았습니다." },
          { status: 500 }
        );
      }

      const apiUrl = new URL(
        "https://www.googleapis.com/youtube/v3/search"
      );

      apiUrl.search = new URLSearchParams({
        part: "snippet",
        type: "video",
        maxResults: "24",
        q: query,
        key: env.YOUTUBE_API_KEY
      });

      const apiResponse = await fetch(apiUrl);
      const result = await apiResponse.json();

      if (!apiResponse.ok) {
        return Response.json(
          { error: result.error?.message || "YouTube 검색 오류" },
          { status: apiResponse.status }
        );
      }

      const items = (result.items || [])
        .filter((item) => item.id?.videoId)
        .map((item) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail:
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url
        }));

      return Response.json(
        { items },
        {
          headers: {
            "Cache-Control": "public, max-age=60"
          }
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  }
};
