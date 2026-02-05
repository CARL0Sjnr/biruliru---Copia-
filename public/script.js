const container = document.getElementById("container");
const searchButton = document.getElementById("searchButton");
const searchInput = document.getElementById("searchInput");
const scrollButton = document.getElementById("scrollButton");
const sortSelect = document.getElementById("sortSelect");
const mediaTypeSelect = document.getElementById("mediaTypeSelect");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modalImg");
const closeModal = document.getElementById("closeModal");
const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");
const downloadImg = document.getElementById("downloadImg");
const prevImage = document.getElementById("prevImage");
const nextImage = document.getElementById("nextImage");
const imageCounter = document.getElementById("imageCounter");
// 🚨 NOVO: Referência ao cabeçalho principal (Header)
const mainHeader = document.getElementById("mainHeader"); 

let after = null, 
    queryAtual = "trueanal", 
    carregando = false, 
    scrollAtivo = false, 
    zoomLevel = 1,
    currentSubreddit = null,
    currentGallery = [],
    currentImageIndex = 0;
// 🚨 NOVO: Variável para rastrear a posição do scroll
let lastScrollY = 0; 


// =================================================================
// ─── NOVO: LÓGICA DE MOSTRAR/ESCONDER CABEÇALHO ───────────────────
// =================================================================

function handleScrollHeader() {
    if (!mainHeader) return; // Se o header não existe no HTML, ignora
    
    // Pega a posição atual da página
    const currentScrollY = window.scrollY;
    const headerHeight = mainHeader.offsetHeight;
    
    // Se a página for rolada para baixo (currentScrollY > lastScrollY) E já tiver rolado mais que a altura do cabeçalho
    if (currentScrollY > lastScrollY && currentScrollY > headerHeight) {
        // Esconde o cabeçalho
        mainHeader.style.transform = `translateY(-${headerHeight}px)`;
    } 
    // Se a página for rolada para cima (currentScrollY < lastScrollY)
    else if (currentScrollY < lastScrollY) {
        // Mostra o cabeçalho
        mainHeader.style.transform = "translateY(0)";
    }
    
    // Atualiza a última posição de scroll para o próximo ciclo
    lastScrollY = currentScrollY;
}


// =================================================================
// ─── NOVO: TENTATIVA MÚLTIPLA DE FETCH (FALLBACK PROXY) ──────────
// =================================================================

async function tryFetch(url) {
    // A URL que você quer buscar (ex: do Reddit)
    const encodedUrl = encodeURIComponent(url);

    const attempts = [
        // 1. Tenta o Proxy Vercel (Se falhar com 404, cai fora)
        { name: "Proxy Local (/api/search)", url: `/api/search?url=${encodedUrl}`, isProxy: true },
        
        // 2. Proxies Públicas de Backup
        { name: "thingproxy", url: `https://thingproxy.freeboard.io/fetch/${url}` },
        { name: "allorigins", url: `https://api.allorigins.win/raw?url=${encodedUrl}` },
        { name: "old reddit", url: url.replace("https://www.reddit.com", "https://old.reddit.com") },
        
        // 3. Tenta a fonte direta (Geralmente falha por CORS/403)
        { name: "reddit normal (direto)", url: url }, 
        { name: "corsproxy.io", url: `https://corsproxy.io/?${encodedUrl}` }
    ];

    for (const attempt of attempts) {
        try {
            console.log(`🔄 Tentando via: ${attempt.name}`);

            const res = await fetch(attempt.url, {
                headers: {
                    "User-Agent": "MeuRedditApp/1.0 (Web Client)"
                }
            });

            const text = await res.text();
            
            if (!attempt.isProxy && !res.ok) {
                console.log(`⚠ ${attempt.name} falhou com status: ${res.status}. Tentando o próximo...`);
                continue;
            }

            // ❌ Se retornar HTML, não é o JSON do Reddit. Tenta o próximo
            if (text.startsWith("<") || text.includes('<html>')) {
                console.log(`⚠ ${attempt.name} retornou HTML! Tentando o próximo...`);
                continue;
            }

            // ✔ Se for JSON válido, retornamos o objeto
            try {
                return JSON.parse(text);
            } catch (jsonError) {
                console.log(`❌ ${attempt.name} retornou texto, mas não é JSON válido.`, jsonError);
                continue; 
            }

        } catch (e) {
            console.log(`❌ Erro em ${attempt.name}:`, e.message);
            continue;
        }
    }

    console.log("⛔ Todas as fontes falharam!");
    return null;
}

// ─── MODAL ATUALIZADO ─────────────────────────────────────
function openModal(src, galleryImages = null) {
    // 🛑 REMOVIDO: openAdPopup(); - A função de abrir pop-up foi removida
    
    modal.style.display = "block";
    modalImg.src = src;
    zoomLevel = 1;
    modalImg.style.transform = `scale(${zoomLevel})`;
    modalImg.style.transformOrigin = "center center";
    
    // Configurar galeria se houver
    if (galleryImages && galleryImages.length > 1) {
        currentGallery = galleryImages;
        currentImageIndex = galleryImages.indexOf(src);
        updateGalleryNavigation();
    } else {
        currentGallery = [];
        currentImageIndex = 0;
        hideGalleryNavigation();
    }
    
    updateImageCounter();
}

function updateGalleryNavigation() {
    prevImage.classList.remove('hidden');
    nextImage.classList.remove('hidden');
    
    prevImage.disabled = currentImageIndex === 0;
    nextImage.disabled = currentImageIndex === currentGallery.length - 1;
}

function hideGalleryNavigation() {
    prevImage.classList.add('hidden');
    nextImage.classList.add('hidden');
}

function updateImageCounter() {
    if (currentGallery.length > 1) {
        imageCounter.textContent = `${currentImageIndex + 1} / ${currentGallery.length}`;
        imageCounter.style.display = 'block';
    } else {
        imageCounter.style.display = 'none';
    }
}

function navigateGallery(direction) {
    if (currentGallery.length === 0) return;
    
    currentImageIndex += direction;
    
    if (currentImageIndex < 0) currentImageIndex = 0;
    if (currentImageIndex >= currentGallery.length) currentImageIndex = currentGallery.length - 1;
    
    modalImg.style.opacity = '0.5';
    
    const newImage = new Image();
    newImage.onload = function() {
        modalImg.src = this.src;
        modalImg.style.opacity = '1';
        zoomLevel = 1;
        modalImg.style.transform = `scale(${zoomLevel})`;
        modalImg.style.transformOrigin = "center center";
        updateGalleryNavigation();
        updateImageCounter();
    };
    newImage.onerror = function() {
        modalImg.style.opacity = '1';
        console.error('Erro ao carregar imagem da galeria');
    };
    newImage.src = currentGallery[currentImageIndex];
}

// Event Listeners para navegação da galeria
prevImage.addEventListener('click', () => navigateGallery(-1));
nextImage.addEventListener('click', () => navigateGallery(1));

// Navegação por teclado
document.addEventListener('keydown', (e) => {
    if (modal.style.display !== 'block') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            if (currentGallery.length > 1) navigateGallery(-1);
            break;
        case 'ArrowRight':
            if (currentGallery.length > 1) navigateGallery(1);
            break;
        case 'Escape':
            modal.style.display = 'none';
            break;
    }
});

// =================================================================
// ─── FUNÇÃO DE FETCH E RENDER ─────────────────────────────────────
// =================================================================

async function fetchAndRender(reset = false, subreddit = null) {
    // Se o age gate não foi aprovado, não carrega conteúdo restrito
    if (localStorage.getItem("adult_ok") !== "true" && queryAtual.includes("anal")) {
          console.warn("Conteúdo adulto bloqueado pelo Age Gate.");
          if (reset) container.innerHTML = "<div style='color: white; padding: 20px; text-align: center;'>Acesso negado. Confirme sua idade para ver conteúdo restrito.</div>";
          return;
    }


    if (carregando) return;
    carregando = true;
    
    if (reset) { 
        container.innerHTML = ""; 
        after = null; 
        if (!subreddit) {
            queryAtual = searchInput.value.trim() || "eu_nvr";
        }
        currentSubreddit = subreddit;
    }
    
    const sort = sortSelect.value;
    const mediaType = mediaTypeSelect.value;
    
    let url;
    if (currentSubreddit) {
        url = `https://www.reddit.com/r/${currentSubreddit}/${sort}.json?limit=60&include_over_18=true`;
    } else if (queryAtual) {
        if (sort === 'relevance') {
            url = `https://www.reddit.com/search.json?q=${encodeURIComponent(queryAtual)}&type=media&limit=60&include_over_18=true`;
        } else {
            url = `https://www.reddit.com/search.json?q=${encodeURIComponent(queryAtual)}&sort=${sort}&type=media&limit=60&include_over_18=true`;
        }
    } else {
        url = `https://www.reddit.com/r/wallpapers/${sort}.json?limit=60&include_over_18=true`;
    }

    if (after) {
        url += `${url.includes('?') ? '&' : '?'}after=${after}`;
    }

    try {
        const data = await tryFetch(url);

        if (!data) {
            console.error("Não foi possível obter dados de nenhuma fonte.");
            if (reset) container.innerHTML = "<div style='color: white; padding: 20px; text-align: center;'>Não foi possível carregar o conteúdo (todas as tentativas falharam).</div>";
            return; 
        }

        if (!data.data || !data.data.children) {
            console.warn("Resposta do Reddit veio em formato de erro/restrição:", data);
            
            let errorMessage = "Conteúdo restrito, subreddit banido ou não encontrado.";
            if (data.message || data.reason) { 
                errorMessage = data.message || data.reason;
            }
            
            if (reset) container.innerHTML = `<div style='text-align:center; padding:20px; color: #ff5555'>Erro: ${errorMessage}</div>`;
            return; 
        }

        after = data.data.after || null;
        
        // 🛑 REMOVIDO: let postsRenderedInBatch = 0; // Contador de posts nesta chamada

        const posts = data.data.children.filter(({data: post}) => {
            if (mediaType === 'all') return true;
            
            if (mediaType === 'image') {
                return post.post_hint === "image" && post.url;
            }
            
            if (mediaType === 'gallery') {
                return post.url.includes("reddit.com/gallery/") && post.media_metadata;
            }
            
            if (mediaType === 'video') {
                return post.media?.reddit_video || 
                    post.url.endsWith(".mp4") || 
                    post.url.includes("redgifs.com") ||
                    post.url.includes("v.redd.it");
            }
            
            return true;
        });

        posts.forEach(({data: post}) => {
            const div = document.createElement("div"); 
            div.classList.add("post");
            let content = "";

            // Lógica de Encurtador será implementada aqui (ou em um novo elemento)
            // Por enquanto, a renderização é mantida, mas a lógica de anúncio está fora.

            if (post.post_hint === "image" && post.url) {
                content = `
                    <h3>${post.title}</h3>
                    <img class="lazy-media" data-src="${post.url}" data-full="${post.url}">
                    <p>
                        <span class="subreddit-link" data-subreddit="${post.subreddit}" style="cursor:pointer;color:#0079d3;">
                            r/${post.subreddit}
                        </span>
                        <span class="post-score">⬆️ ${post.score}</span>
                    </p>
                `;
            }
            else if (post.url.includes("reddit.com/gallery/") && post.media_metadata) {
                const imgs = Object.values(post.media_metadata).map(m => m.s?.u?.replace(/&amp;/g,"&") || m.p?.[0]?.u?.replace(/&amp;/g,"&")).filter(Boolean);
                const primeiras = imgs.slice(0,4), resto = imgs.slice(4);
                const todasImagens = [...primeiras, ...resto];
                
                content = `
                    <h3>${post.title}</h3>
                    <div class="galeria">
                        ${primeiras.map(src=>`<img class="lazy-media" data-src="${src}" data-full="${src}" data-gallery='${JSON.stringify(todasImagens)}'>`).join("")}
                        ${resto.length ? `<div class="ver-mais" data-imagens='${JSON.stringify(resto)}' data-gallery='${JSON.stringify(todasImagens)}'>+${resto.length} mais</div>` : ""}
                    </div>
                    <p>
                        <span class="subreddit-link" data-subreddit="${post.subreddit}" style="cursor:pointer;color:#0079d3;">
                            r/${post.subreddit}
                        </span>
                        <span class="post-score">⬆️ ${post.score}</span>
                    </p>
                `;
            }
            else if (post.media?.reddit_video || post.url.endsWith(".mp4") || post.url.includes("redgifs.com") || post.url.includes("v.redd.it")) {
                let src = post.media?.reddit_video?.fallback_url || 
                        (post.url.endsWith(".mp4") ? post.url : 
                        post.url.includes("redgifs.com") ? post.url.replace("https://www.redgifs.com/watch/", "https://redgifs.com/ifr/") : 
                        post.url);
                
                if (src.includes("redgifs.com/ifr/")) {
                    content = `
                        <h3>${post.title}</h3>
                        <iframe class="lazy-media" data-src="${src}" width="100%" height="450" allowfullscreen></iframe>
                        <p>
                            <span class="subreddit-link" data-subreddit="${post.subreddit}" style="cursor:pointer;color:#0079d3;">
                                r/${post.subreddit}
                            </span>
                            <span class="post-score">⬆️ ${post.score}</span>
                        </p>
                    `;
                } else {
                    content = `
                        <h3>${post.title}</h3>
                        <video class="lazy-media" data-src="${src}"autoplay muted loop playsinline></video>
                        <p>
                            <span class="subreddit-link" data-subreddit="${post.subreddit}" style="cursor:pointer;color:#0079d3;">
                                r/${post.subreddit}
                            </span>
                            <span class="post-score">⬆️ ${post.score}</span>
                        </p>
                    `;
                }
            }

            if (content) {
                div.innerHTML = content; 
                container.appendChild(div);

                div.querySelectorAll(".lazy-media").forEach(el => observer.observe(el));
            }
        });

    } catch (err) { 
        console.error("Erro ao buscar dados (final):", err); 
        if (reset) container.innerHTML = `<div style='text-align:center; padding:20px; color: #ff5555'>Erro fatal: ${err.message}</div>`;
    }
    finally { 
        carregando = false; 
    }
}

// ─── EVENT LISTENERS ──────────────────────────────────────
document.addEventListener("click", e => {
    if (e.target.matches(".post img, .galeria img")) {
        const galleryData = e.target.dataset.gallery;
        const galleryImages = galleryData ? JSON.parse(galleryData) : null;
        openModal(e.target.dataset.full, galleryImages);
    }
    
    if (e.target.matches(".ver-mais")) {
        const galleryImages = JSON.parse(e.target.dataset.gallery);
        const firstImage = galleryImages.length > 0 ? galleryImages[0] : null; 
        if(firstImage) {
            openModal(firstImage, galleryImages);
        } else {
            console.error("Galeria vazia ou formato inesperado.");
        }
    }
    
    if (e.target.matches(".subreddit-link")) {
        const subredditName = e.target.dataset.subreddit;
        console.log("Subreddit clicado:", subredditName);
        fetchAndRender(true, subredditName);
    }
});

// ─── RESTANTE DO CÓDIGO (mantido igual) ───────────────────
closeModal.addEventListener("click", () => modal.style.display = "none");
modal.addEventListener("click", e => { 
    if (e.target === modal) modal.style.display = "none"; 
});

zoomIn.addEventListener("click", () => setZoom(zoomLevel + 0.1));
zoomOut.addEventListener("click", () => setZoom(Math.max(0.1, zoomLevel - 0.1)));

modal.addEventListener("wheel", e => { 
    if (modal.style.display !== "block") return; 
    e.preventDefault(); 
    const rect = modalImg.getBoundingClientRect(); 
    const fx = ((e.clientX - rect.left) / rect.width) * 100; 
    const fy = ((e.clientY - rect.top) / rect.height) * 100; 
    setZoom(e.deltaY < 0 ? zoomLevel + 0.1 : Math.max(0.1, zoomLevel - 0.1), fx, fy); 
});

// 🛑 CORREÇÃO: Função para forçar o download
downloadImg.addEventListener("click", () => { 
    const a = document.createElement("a"); 
    a.href = modalImg.src; 
    a.download = modalImg.src.split("/").pop().split("?")[0] || "imagem_download.jpg"; // Gera nome de arquivo
    document.body.appendChild(a);
    a.click(); 
    document.body.removeChild(a); // Remove o elemento 'a'
});

function setZoom(level, fx = 50, fy = 50) { 
    zoomLevel = level; 
    modalImg.style.transformOrigin = `${fx}% ${fy}%`; 
    modalImg.style.transform = `scale(${zoomLevel})`; 
}

// ─── LAZY LOAD E OUTRAS FUNÇÕES ────────────────────────
const observer = new IntersectionObserver(entries => { 
    entries.forEach(entry => { 
        if (!entry.isIntersecting) return; 
        const el = entry.target; 
        const src = el.dataset.src; 
        if (!src) return; 
        if (el.tagName === "IMG") el.src = src; 
        else if (el.tagName === "VIDEO") { el.src = src; el.load(); } 
        else if (el.tagName === "IFRAME") el.src = src; 
        el.classList.remove("lazy-media"); 
        observer.unobserve(el); 
    }); 
}, { rootMargin: "400px", threshold: 0.1 });

// 🚨 NOVO: Chamada da função de scroll do Header
window.addEventListener("scroll", () => { 
    handleScrollHeader(); // ⬅️ CHAMADA DA NOVA FUNÇÃO
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400 && !carregando) 
        fetchAndRender(); 
});

scrollButton.addEventListener("click", () => { 
    scrollAtivo = !scrollAtivo; 
    scrollButton.textContent = scrollAtivo ? "Parar Scroll Automático" : "Ativar Scroll Automático"; 
    if (scrollAtivo) {
        // 🚨 NOVO: Esconde o cabeçalho ao ativar o scroll automático
        if (mainHeader) mainHeader.style.transform = `translateY(-${mainHeader.offsetHeight}px)`;
        autoScroll();
    } else {
        // 🚨 NOVO: Mostra o cabeçalho ao desativar
        if (mainHeader) mainHeader.style.transform = "translateY(0)";
    }
});

function autoScroll() { 
    if (!scrollAtivo) return; 
    window.scrollBy(0, 1); 
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) 
        fetchAndRender(); 
    requestAnimationFrame(autoScroll); 
}

searchButton.addEventListener("click", () => fetchAndRender(true));
searchInput.addEventListener("keypress", e => { 
    if (e.key === "Enter") fetchAndRender(true); 
});

sortSelect.addEventListener("change", () => fetchAndRender(true));
mediaTypeSelect.addEventListener("change", () => fetchAndRender(true));

// 🛑 REMOVIDAS: As funções 'openAdPopup()' e 'criarCardDeAnuncio()' foram removidas.
// O código de inserção de anúncios na fetchAndRender foi removido.

// ============================================================
// AGE GATE (Chamado no final)
// ============================================================
function criarAgeGate() {
    if (localStorage.getItem("adult_ok") === "true") return;

    const overlay = document.createElement("div");
    overlay.id = "ageGateOverlay";
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.9);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
        background: #1a1a1a;
        color: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        width: 90%;
        max-width: 400px;
        font-family: sans-serif;
    `;

    box.innerHTML = `
        <h2 style="margin-bottom:15px;">🔞 Conteúdo Adulto</h2>
        <p style="margin-bottom:20px;font-size:16px;line-height:1.4;">
            Este site contém conteúdo destinado somente a maiores de 18 anos.
        </p>

        <button id="btnAdultYes" 
            style="background:#28a745;color:white;padding:10px 15px;border:0;border-radius:6px;font-size:16px;cursor:pointer;width:100%;margin-bottom:10px;">
            Tenho mais de 18 anos
        </button>

        <button id="btnAdultNo" 
            style="background:#dc3545;color:white;padding:10px 15px;border:0;border-radius:6px;font-size:16px;cursor:pointer;width:100%;">
            Tenho menos de 18 anos
        </button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById("btnAdultYes").onclick = () => {
        localStorage.setItem("adult_ok", "true");
        overlay.remove();
        if (container.innerHTML.includes("Acesso negado.")) {
            fetchAndRender(true); 
        }
    };

    document.getElementById("btnAdultNo").onclick = () => {
        window.location.href = "https://www.google.com/";
    };
}

// ─── INICIAL ──────────────────────────────────────────────
criarAgeGate();
fetchAndRender();