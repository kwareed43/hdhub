// ============================================================
// HDHub4u.js - Fully Deobfuscated & Readable
// ============================================================
//
// This is a Node.js scraper for the hdhub4u movie/TV piracy site.
// It takes a TMDB (The Movie Database) ID, searches hdhub4u for
// matching content, and extracts download/stream links from
// various file hosts.
//
// Exports: { getStreams(tmdbId, type, season?, episode?) }
//
// Key Dependencies: cheerio-without-node-native, crypto-js
// File hosts supported: HubCloud, Pixeldrain, StreamTape,
//   HubCdn, HdStream4u, HbLinks, VidStack/Hubstream,
//   Direct R2, ZipDisk
// ============================================================

// ============================================================
// ES Module helpers (Object spread, async wrapper)
// ============================================================
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;

function __defNormalProp(obj, key, value) {
  if (key in obj) {
    __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value: value });
  } else {
    obj[key] = value;
  }
}

function __spreadValues(target, source) {
  for (var key in source || {}) {
    if (__hasOwnProp.call(source, key)) __defNormalProp(target, key, source[key]);
  }
  if (__getOwnPropSymbols) {
    for (var sym of __getOwnPropSymbols(source)) {
      if (__propIsEnum.call(source, sym)) __defNormalProp(target, sym, source[sym]);
    }
  }
  return target;
}

var __spreadProps = (target, props) => __defProps(target, __getOwnPropDescs(props));

function __copyProps(to, from, except, desc) {
  if (from && (typeof from === "object" || typeof from === "function")) {
    for (let key of __getOwnPropNames(from)) {
      if (!__hasOwnProp.call(to, key) && key !== except) {
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
      }
    }
  }
  return to;
}

function __toESM(module, exports, esmDefault) {
  esmDefault = module != null ? __create(__getProtoOf(module)) : {};
  __copyProps(exports || !module || !module.__esModule
    ? __defProp(esmDefault, 'default', { value: module, enumerable: true })
    : esmDefault, module);
  return esmDefault;
}

function __async(context, args, generator) {
  return new Promise((resolve, reject) => {
    var stepNext = (val) => {
      try { step(generator.next(val)); }
      catch (e) { reject(e); }
    };
    var stepThrow = (err) => {
      try { step(generator.throw(err)); }
      catch (e) { reject(e); }
    };
    var step = (result) => {
      if (result.done) resolve(result.value);
      else Promise.resolve(result.value).then(stepNext, stepThrow);
    };
    step((generator = generator.apply(context, args)).next());
  });
}

// ============================================================
// Imports & Configuration
// ============================================================
var import_cheerio_without_node_native2 = __toESM(require('cheerio-without-node-native'));

var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://new1.hdhub4u.cl";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  'Cookie': 'xla=s4t',
  'Referer': MAIN_URL + '/'
};

function updateMainUrl(newUrl) {
  MAIN_URL = newUrl;
  HEADERS.Referer = newUrl + '/';
}

var domainCacheTimestamp = 0;

// ============================================================
// Utility: Format bytes to human-readable size
// ============================================================
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "Unknown";
  var units = ["Bytes", 'KB', 'MB', 'GB', 'TB'];
  var base = 1024;
  var exp = Math.floor(Math.log(bytes) / Math.log(base));
  return parseFloat((bytes / Math.pow(base, exp)).toFixed(1)) + ' ' + units[exp];
}

// ============================================================
// Utility: Extract server name from link text
// ============================================================
function extractServerName(linkText) {
  if (!linkText) return 'Unknown';

  if (linkText.startsWith('HubCloud')) {
    var match = linkText.match(/HubCloud(?:\s*-\s*([^[\]]+))?/);
    return match ? (match[1] || 'Download') : 'HubCloud';
  }
  if (linkText.startsWith('Pixeldrain')) return 'Pixeldrain';
  if (linkText.startsWith('StreamTape')) return "StreamTape";
  if (linkText.startsWith("HubCdn")) return "HubCdn";
  if (linkText.startsWith("HbLinks")) return "HbLinks";
  if (linkText.startsWith("Hubstream")) return "Hubstream";

  return linkText.replace(/^www\./, '').split('.')[0];
}

// ============================================================
// Utility: ROT13 cipher
// ============================================================
function rot13(text) {
  return text.replace(/[a-zA-Z]/g, function(ch) {
    var code = ch.charCodeAt(0) + 13;
    if ((ch <= 'Z' ? 90 : 122) >= code) {
      return String.fromCharCode(code);
    }
    return String.fromCharCode(code - 26);
  });
}

// ============================================================
// Custom Base64 decode (uses custom alphabet)
// ============================================================
var BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function atob(str) {
  if (!str) return '';
  var input = String(str).replace(/=+$/, '');
  var output = '';
  var buffer = 0;
  var bits = 0;
  var i = 0;

  while (i < input.length) {
    var idx = BASE64_CHARS.indexOf(input[i]);
    i++;
    if (idx === -1) continue;

    buffer = (buffer << 6) | idx;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode(255 & (buffer >> bits));
    }
  }
  return output;
}

// ============================================================
// Utility: Extract quality tags from filename
// ============================================================
function cleanTitle(filename) {
  // Remove file extension
  var name = filename.replace(/\.[a-zA-Z0-9]{2,4}$/, '');

  // Normalize quality/codec tags
  var cleaned = name
    .replace(/WEB[-_. ]?DL/gi, "WEB-DL")
    .replace(/WEB[-_. ]?RIP/gi, 'WEBRIP')
    .replace(/H[ .]?265/gi, "H265")
    .replace(/H[ .]?264/gi, "H264")
    .replace(/DDP[ .]?([0-9]\.[0-9])/gi, 'DDP$1');

  var parts = cleaned.split(/[\s_.]/);

  var qualityTags = new Set([
    'WEB-DL', "WEBRIP", 'BLURAY', 'HDRIP', 'DVDRIP', 'HDTV', "CAM", 'TS', "BRRIP", 'BDRIP'
  ]);
  var codecTags = new Set([
    'H264', 'H265', 'X264', 'X265', 'HEVC', "AVC"
  ]);
  var audioTags = [
    "AAC", 'AC3', "DTS", 'MP3', 'FLAC', 'DD', 'DDP', 'EAC3'
  ];
  var atmosTags = new Set(['ATMOS']);
  var hdrTags = new Set(['SDR', 'HDR', 'HDR10', 'HDR10+', 'DV', 'DOLBYVISION']);

  var foundTags = parts.map(function(part) {
    var upper = part.toUpperCase();

    if (qualityTags.has(upper)) return upper;
    if (codecTags.has(upper)) return upper;
    if (audioTags.some(function(tag) { return upper.startsWith(tag); })) return upper;
    if (atmosTags.has(upper)) return upper;
    if (hdrTags.has(upper)) {
      if (upper === 'DOLBYVISION' || upper === 'DV') return "DOLBYVISION";
      return upper;
    }
    if (upper === 'NF' || upper === 'CR') return upper;
    return null;
  }).filter(Boolean);

  return [...new Set(foundTags)].join(' ');
}

// ============================================================
// Domain updater - fetches latest active hdhub4u domain
// ============================================================
function fetchAndUpdateDomain() {
  return __async(this, null, function*() {
    var now = Date.now();
    if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL) return;

    console.log('[HDHub4u] Fetching latest domain...');
    try {
      var response = yield fetch(DOMAINS_URL, {
        'method': "GET",
        'headers': {
          'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      if (response.ok) {
        var data = yield response.json();
        if (data && data.HDHUB4u) {
          var newDomain = data.HDHUB4u;
          if (newDomain !== MAIN_URL) {
            console.log('[HDHub4u] Updating domain from ' + MAIN_URL + " to " + newDomain);
            updateMainUrl(newDomain);
            domainCacheTimestamp = now;
          }
        }
      }
    } catch (err) {
      console.error("[HDHub4u] Failed to fetch latest domains: " + err.message);
    }
  });
}

function getCurrentDomain() {
  return __async(this, null, function*() {
    yield fetchAndUpdateDomain();
    return MAIN_URL;
  });
}

// ============================================================
// Title matching utilities
// ============================================================
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, '')
    .replace(/[:\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function calculateTitleSimilarity(titleA, titleB) {
  var normA = normalizeTitle(titleA);
  var normB = normalizeTitle(titleB);

  if (normA === normB) return 1;

  var wordsA = normA.split(/\s+/).filter(function(w) { return w.length > 0; });
  var wordsB = normB.split(/\s+/).filter(function(w) { return w.length > 0; });

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  var setA = new Set(wordsA);
  var setB = new Set(wordsB);

  var common = wordsA.filter(function(w) { return setB.has(w); });
  var all = new Set([...wordsA, ...wordsB]);

  var score = common.length / all.size;

  var extraB = wordsB.filter(function(w) { return !setA.has(w); });
  score -= extraB.length * 0.05;

  // Bonus if all words in A are present in B
  if (wordsA.length > 0 && wordsA.every(function(w) { return setB.has(w); })) {
    score += 0.2;
  }

  return score;
}

function findBestTitleMatch(tmdbItem, searchResults, mediaType, season) {
  if (!searchResults || searchResults.length === 0) return null;

  var bestMatch = null;
  var bestScore = 0;

  for (var result of searchResults) {
    var score = calculateTitleSimilarity(tmdbItem.title, result.title);

    // Year matching bonus
    if (tmdbItem.year && result.year) {
      var yearDiff = Math.abs(tmdbItem.year - result.year);
      if (yearDiff === 0) score += 0.2;
      else if (yearDiff <= 1) score += 0.1;
      else if (yearDiff > 5) score -= 0.3;
    }

    // TV show season matching
    if (mediaType === 'tv' && season) {
      var lowerTitle = result.title.toLowerCase();
      var seasonPatterns = [
        'season ' + season,
        's' + season,
        'season ' + season.toString().padStart(2, '0'),
        's' + season.toString().padStart(2, '0')
      ];
      var hasSeason = seasonPatterns.some(function(p) { return lowerTitle.includes(p); });

      var seasonMatch = lowerTitle.match(/season\s*(\d+)|s(\d+)/i);
      if (seasonMatch) {
        var foundSeason = parseInt(seasonMatch[1] || seasonMatch[2]);
        if (foundSeason !== season) score -= 0.8;
      }

      if (hasSeason) score += 0.5;
      else score -= 0.3;
    }

    // Quality bonus for 4K/2160p
    if (result.title.toLowerCase().includes('2160p') || result.title.toLowerCase().includes('4k')) {
      score += 0.05;
    }

    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = result;
    }
  }

  if (bestMatch) {
    console.log('[HDHub4u] Best title match: "' + bestMatch.title + '" (score: ' + bestScore.toFixed(2) + ')');
  }

  return bestMatch;
}

// ============================================================
// TMDB API - Fetch movie/TV show details
// ============================================================
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function*() {
    var endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    var url = TMDB_BASE_URL + '/' + endpoint + '/' + tmdbId + "?api_key=" + TMDB_API_KEY + "&append_to_response=external_ids";

    var response = yield fetch(url, {
      'method': "GET",
      'headers': {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error('TMDB API error: ' + response.status);

    var data = yield response.json();
    var title = mediaType === 'tv' ? data.name : data.title;
    var releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
    var year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
    var imdbId = (data.external_ids == null ? undefined : data.external_ids.imdb_id) || null;

    return { 'title': title, 'year': year, 'imdbId': imdbId };
  });
}

var import_cheerio_without_node_native = __toESM(require('cheerio-without-node-native'));
var import_crypto_js = __toESM(require('crypto-js'));

// ============================================================
// Link Shortener / Redirect Resolver
// ============================================================
function getRedirectLinks(url) {
  return __async(this, null, function*() {
    try {
      var response = yield fetch(url, { 'headers': HEADERS });
      if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);

      var html = yield response.text();

      // Extract encoded data from inline script
      var regex = /s\s*\(\s*['"]o['"]\s*,\s*['"]([A-Za-z0-9+/=]+)['"]|ck\s*\(\s*['"]_wp_http_\d+['"]\s*,\s*['"]([^'"]+)['"]/g;
      var encodedData = '';
      var match;

      while ((match = regex.exec(html)) !== null) {
        var data = match[1] || match[2];
        if (data) encodedData += data;
      }

      if (!encodedData) {
        // Try direct redirect
        var redirectMatch = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
        if (redirectMatch && redirectMatch[1]) {
          var dest = redirectMatch[1];
          if (dest !== url && !dest.includes(url)) {
            return yield getRedirectLinks(dest);
          }
        }
        return null;
      }

      // Decode the data (triple base64 + ROT13)
      var decoded = atob(rot13(atob(atob(encodedData))));
      var parsed = JSON.parse(decoded);

      var directLink = atob(parsed['o'] || '').trim();
      if (directLink) return directLink;

      var re = atob(parsed["reurl"] || '').trim();
      var link = (parsed["link="] || '').trim();

      if (link && re) {
        var linkResponse = yield fetch(link + '?re=' + re, { 'headers': HEADERS });
        var linkHtml = yield linkResponse.text();
        var $ = import_cheerio_without_node_native.default.load(linkHtml);
        return ($("body").html() || linkHtml).trim();
      }

      return null;
    } catch (err) {
      return null;
    }
  });
}

// ============================================================
// VidStack / Hubstream Extractor
// ============================================================
function vidStackExtractor(url) {
  return __async(this, null, function*() {
    try {
      var videoId = url.split('#').pop().split('/').pop();
      var origin = new URL(url).origin;
      var apiUrl = origin + "/api/v1/video?id=" + videoId;

      var response = yield fetch(apiUrl, {
        'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': url })
      });

      var responseText = (yield response.text()).trim();

      var key = import_crypto_js.default.enc.Utf8.parse("xla=s4t");
      var ivs = ["cryptoinsights.site", "gadgetsweb.xyz"];

      for (var ivStr of ivs) {
        try {
          var iv = import_crypto_js.default.enc.Utf8.parse(ivStr);
          var decrypted = import_crypto_js.default.AES.decrypt(
            { 'ciphertext': import_crypto_js.default.enc.Hex.parse(responseText) },
            key,
            { 'iv': iv, 'mode': import_crypto_js.default.mode.CBC, 'padding': import_crypto_js.default.pad.Pkcs7 }
          );
          var plaintext = decrypted.toString(import_crypto_js.default.enc.Utf8);

          if (plaintext && plaintext.includes('M3U8')) {
            var sourceMatch = plaintext.match(/"source":"(.*?)"/);
            var sourceUrl = sourceMatch ? sourceMatch[1].replace(/\\/g, '') : undefined;

            var subtitles = [];
            var subtitleMatch = plaintext.match(/"subtitle":\{(.*?)\}/);
            if (subtitleMatch) {
              var subRegex = /"([^"]+)":\s*"([^"]+)"/g;
              var subResult;
              while ((subResult = subRegex.exec(subtitleMatch[1])) !== null) {
                var lang = subResult[1];
                var subUrl = subResult[2].split('#')[0].replace(/\\/g, '');
                if (subUrl) {
                  subtitles.push({
                    'language': lang,
                    'url': subUrl.startsWith('http') ? subUrl : '' + origin + subUrl
                  });
                }
              }
            }

            if (sourceUrl) {
              return [{
                'source': 'Vidstack Hubstream',
                'quality': '1080p',
                'url': sourceUrl.replace('https:', 'http:'),
                'headers': {
                  'Referer': url,
                  'Origin': url.split('/').slice(0, 3).join('/')
                },
                'subtitles': subtitles
              }];
            }
          }
        } catch (e) {}
      }
      return [];
    } catch (err) {
      return [];
    }
  });
}

// ============================================================
// HbLinks Extractor
// ============================================================
function hbLinksExtractor(url) {
  return __async(this, null, function*() {
    try {
      var response = yield fetch(url, {
        'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': url })
      });
      var html = yield response.text();
      var $ = import_cheerio_without_node_native.default.load(html);

      var links = $('h3 a, h5 a, div.entry-content p a')
        .map(function(i, el) { return $(el).attr('href'); })
        .get();

      var results = yield Promise.all(links.map(function(link) {
        return loadExtractor(link, url);
      }));

      return results.flat().map(function(item) {
        return __spreadProps(__spreadValues({}, item), {
          'source': item.source + " Hblinks"
        });
      });
    } catch (err) {
      return [];
    }
  });
}

// ============================================================
// Pixeldrain Extractor
// ============================================================
function pixelDrainExtractor(url) {
  return __async(this, null, function*() {
    try {
      var parsed = new URL(url);
      var baseUrl = parsed.protocol + '//' + parsed.hostname;
      var fileId = (url.match(/(?:file|u)\/([A-Za-z0-9]+)/) || [])[1] || url.split('/').pop();

      if (!fileId) return [{ 'source': "Pixeldrain", 'quality': 0, 'url': url }];

      var downloadUrl = url.includes('?download') ? url : baseUrl + '/api/file/' + fileId + '?download';

      return [{
        'source': 'Pixeldrain',
        'quality': 0,
        'url': downloadUrl
      }];
    } catch (err) {
      return [{ 'source': 'Pixeldrain', 'quality': 0, 'url': url }];
    }
  });
}

// ============================================================
// StreamTape Extractor
// ============================================================
function streamTapeExtractor(url) {
  return __async(this, null, function*() {
    try {
      var parsed = new URL(url);
      parsed.hostname = "streamtape.com";

      var response = yield fetch(parsed.toString(), { 'headers': HEADERS });
      var html = yield response.text();

      var videoMatch = html.match(/document\.getElementById\('videolink'\)\.innerHTML = (.*?);/);
      var videoUrl;

      if (videoMatch) {
        var innerMatch = videoMatch[1].match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
        videoUrl = innerMatch ? innerMatch[1] : null;
      }

      if (!videoUrl) {
        var fallback = html.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
        videoUrl = fallback ? fallback[1] : null;
      }

      return videoUrl ? [{
        'source': 'StreamTape',
        'quality': 720,
        'url': 'https:' + videoUrl
      }] : [];
    } catch (err) {
      return [];
    }
  });
}

// ============================================================
// HubCloud Extractor - Main file host
// ============================================================
function hubCloudExtractor(url, referer) {
  return __async(this, null, function*() {
    try {
      var finalUrl = url.replace('hubcloud.cx', 'hubcloud.dad');
      var response = yield fetch(finalUrl, {
        'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': referer })
      });

      var html = yield response.text();
      var currentPage = finalUrl;

      // Follow redirect if not on hubcloud.php page
      if (!finalUrl.includes('hubcloud.php')) {
        var redirectUrl = '';
        var $ = import_cheerio_without_node_native.default.load(html);

        var iframe = $("iframe");
        if (iframe.attr("src")) {
          redirectUrl = iframe.attr("src");
        } else {
          var urlMatch = html.match(/var url = '([^']*)'/);
          if (urlMatch) redirectUrl = urlMatch[1];
        }

        if (redirectUrl) {
          if (!redirectUrl.startsWith('http')) {
            var u = new URL(finalUrl);
            redirectUrl = u.protocol + '//' + u.hostname + '/' + redirectUrl.replace(/^\//, '');
          }
          currentPage = redirectUrl;

          var page2 = yield fetch(currentPage, {
            'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': finalUrl })
          });
          html = yield page2.text();
        }
      }

      var $ = import_cheerio_without_node_native.default.load(html);
      var fileInfo = $("i#size").text().trim();
      var headerText = $('div.card-header').text().trim();

      var qualityMatch = headerText.match(/(\d{3,4})[pP]/);
      var quality = qualityMatch ? parseInt(qualityMatch[1]) : 1080;

      var tags = cleanTitle(headerText);
      var tagSuffix = (tags ? '[' + tags + ']' : '') + (fileInfo ? '[' + fileInfo + ']' : '');

      // Parse file size
      var size = (function() {
        var sMatch = fileInfo.match(/([\d.]+)\s*(GB|MB|KB)/i);
        if (!sMatch) return 0;
        var multipliers = { 'GB': 1024**3, 'MB': 1024**2, 'KB': 1024 };
        return parseFloat(sMatch[1]) * (multipliers[sMatch[2].toUpperCase()] || 0);
      })();

      var links = [];
      var buttons = $('a.btn').get();

      for (var btn of buttons) {
        var href = $(btn).attr("href");
        var btnText = $(btn).text().toLowerCase();
        var fileName = headerText || tags || 'Unknown';

        if (btnText.includes('download file') || btnText.includes("fslv2") || btnText.includes('s3 server') || btnText.includes('fsl server') || href && href.includes('magnet:')) {
          var serverType = "HubCloud - FSL";
          if (href && href.includes('r2.dev')) serverType = "Direct R2";
          else if (href && href.includes('workers.dev')) serverType = "ZipDisk Server";
          else if (btnText.includes("fslv2")) serverType = 'HubCloud - FSLv2';
          else if (btnText.includes('s3 server')) serverType = 'HubCloud - S3';
          else if (btnText.includes('fsl server')) serverType = 'HubCloud - FSLv2';
          else if (btnText.includes('mega server')) serverType = 'HubCloud - Mega';

          links.push({
            'source': serverType + ' ' + tagSuffix,
            'quality': quality,
            'url': href,
            'size': size,
            'fileName': fileName
          });
        } else if (btnText.includes('buzzserver')) {
          try {
            var buzzResponse = yield fetch(href + '/download', {
              'method': 'GET',
              'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': href }),
              'redirect': 'manual'
            });
            var redirectUrl = buzzResponse.headers.get("location") || buzzResponse.headers.get("hx-redirect");
            if (!redirectUrl && buzzResponse.url && buzzResponse.url !== href + '/download') {
              redirectUrl = buzzResponse.url;
            }
            if (redirectUrl) {
              links.push({
                'source': 'HubCloud - BuzzServer ' + tagSuffix,
                'quality': quality,
                'url': redirectUrl,
                'size': size,
                'fileName': fileName
              });
            }
          } catch (e) {}
        } else if (btnText.includes('10gbps') || href && href.includes('http')) {
          var directUrl = href;
          if (href && !href.includes('http')) {
            try {
              var r = yield fetch(href, { 'method': 'GET', 'redirect': 'manual' });
              var loc = r.headers.get("location");
              if (loc && loc.includes('http')) directUrl = loc.substring(loc.indexOf('http') + 5);
            } catch (e) {}
          }
          links.push({
            'source': 'HubCloud - 10Gbps ' + tagSuffix,
            'quality': quality,
            'url': directUrl,
            'size': size,
            'fileName': fileName
          });
        } else if (btnText.includes('zipdisk') || href && href.includes('workers.dev')) {
          links.push({
            'source': 'ZipDisk Server ' + tagSuffix,
            'quality': quality,
            'url': href,
            'size': size,
            'fileName': fileName
          });
        } else if (href && href.includes('pixeldra')) {
          var pdLinks = yield pixelDrainExtractor(href);
          links.push(...pdLinks.map(function(l) {
            return __spreadProps(__spreadValues({}, l), {
              'source': l.source + ' ' + tagSuffix,
              'size': size,
              'fileName': fileName
            });
          }));
        } else if (href && !href.includes('#download') && href.startsWith('http')) {
          var otherLinks = yield loadExtractor(href, currentPage);
          links.push(...otherLinks.map(function(l) {
            return __spreadProps(__spreadValues({}, l), {
              'quality': l.quality || quality
            });
          }));
        }
      }

      return links;
    } catch (err) {
      return [];
    }
  });
}

// ============================================================
// HubCdn Extractor
// ============================================================
function hubCdnExtractor(url, referer) {
  return __async(this, null, function*() {
    try {
      var response = yield fetch(url, {
        'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': referer })
      });
      var html = yield response.text();
      var $ = import_cheerio_without_node_native.default.load(html);

      var scriptContent = '';
      $('script').each(function(i, el) {
        var text = $(el).html();
        if (text && text.includes("reurl")) {
          scriptContent = text;
        }
      });

      if (scriptContent) {
        var reurlMatch = scriptContent.match(/reurl\s*=\s*["']([^"']+)["']/);
        if (reurlMatch && reurlMatch[1]) {
          var result = reurlMatch[1];

          if (result.includes('?r=')) {
            var base64Part = result.split('?r=').pop();
            try {
              var decoded = atob(base64Part);
              var urlStr = decoded.substring(decoded.lastIndexOf("http") + 5);
              if (urlStr && urlStr.startsWith('http')) return [{ 'source': 'HubCdn', 'quality': 1080, 'url': urlStr }];
            } catch (e) {}
          } else if (result.includes("http")) {
            var httpUrl = result.split("http").pop();
            if (httpUrl && httpUrl.startsWith('http')) return [{ 'source': 'HubCdn', 'quality': 1080, 'url': httpUrl }];
          } else if (result.startsWith('http')) {
            return [{ 'source': "HubCdn", 'quality': 1080, 'url': result }];
          }
        }
      }

      var rMatch = html.match(/r=([A-Za-z0-9+/=]+)/);
      if (rMatch && rMatch[1]) {
        try {
          var decoded = atob(rMatch[1]);
          var urlStr = decoded.substring(decoded.lastIndexOf("http") + 5);
          if (urlStr && urlStr.startsWith('http')) return [{ 'source': "HubCdn", 'quality': 1080, 'url': urlStr }];
        } catch (e) {}
      }

      return [];
    } catch (err) {
      return [];
    }
  });
}

// ============================================================
// Main Router: Routes a URL to the right extractor
// ============================================================
function loadExtractor(url) {
  return __async(this, arguments, function*(url, referer) {
    referer = referer || MAIN_URL;
    try {
      var hostname = new URL(url).hostname;

      // Redirect link shorteners
      var isShortener = url.includes('r2.dev') || hostname.includes('hbdl') || hostname.includes('hubcloud.cx') ||
                         hostname.includes('cryptoinsights.site') || hostname.includes('bloggingvector') ||
                         hostname.includes('ampproject.org');

      if (isShortener) {
        var redirectUrl = yield getRedirectLinks(url);
        if (redirectUrl && redirectUrl !== url) return yield loadExtractor(redirectUrl, url);
        return [];
      }

      if (hostname.includes('hubcloud')) return yield hubCloudExtractor(url, referer);
      if (hostname.includes('hubcdn')) return yield hubCdnExtractor(url, referer);
      if (hostname.includes('hblinks') || hostname.includes('hubstream.dad')) return yield hbLinksExtractor(url);
      if (hostname.includes('hubstream') || hostname.includes('vidstack')) return yield vidStackExtractor(url);
      if (hostname.includes('pixeldrain')) return yield pixelDrainExtractor(url);
      if (hostname.includes('streamtape')) return yield streamTapeExtractor(url);
      if (hostname.includes('zipdisk')) return [{ 'source': "ZipDisk Server", 'quality': 1080, 'url': url }];

      if (hostname.includes('hubdrive')) {
        var page = yield fetch(url, { 'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': referer }) });
        var html = yield page.text();
        var $ = import_cheerio_without_node_native.default.load(html);
        var btnUrl = $('.btn.btn-primary.btn-user.btn-success1.m-1').attr("href");
        if (btnUrl) return yield loadExtractor(btnUrl, url);
      }

      return [];
    } catch (err) {
      return [];
    }
  });
}

// ============================================================
// Search hdhub4u via Typesense
// ============================================================
function search(query) {
  return __async(this, null, function*() {
    var today = new Date().toISOString().split('T')[0];
    var searchUrl = "https://search.pingora.fyi/collections/post/documents/search?q=" +
      encodeURIComponent(query) +
      "&query_by=post_title,category&query_by_weights=4,2&sort_by=sort_by_date:desc" +
      "&limit=15&highlight_fields=none&use_cache=true&page=1&analytics_tag=" + today;

    var response = yield fetch(searchUrl, { 'headers': HEADERS });
    var data = yield response.json();

    if (!data || !data.hits) return [];

    return data.hits.map(function(hit) {
      var doc = hit.document;
      var title = doc.post_title;
      var yearMatch = title.match(/\((\d{4})\)|\b(\d{4})\b/);
      var year = yearMatch ? parseInt(yearMatch[1] || yearMatch[2]) : null;

      var url = doc.permalink;
      if (url && url.startsWith('/')) url = '' + MAIN_URL + url;

      return {
        'title': title,
        'url': url,
        'poster': doc.post_thumbnail,
        'year': year
      };
    });
  });
}

// ============================================================
// Get Download Links from a page
// ============================================================
function getDownloadLinks(pageUrl) {
  return __async(this, null, function*() {
    var currentDomain = yield getCurrentDomain();

    // Normalize domain
    if (pageUrl.includes('hdhub4u.')) {
      try {
        var pageUrlParsed = new URL(pageUrl);
        var domainParsed = new URL(currentDomain);
        pageUrlParsed.hostname = domainParsed.hostname;
        pageUrl = pageUrlParsed.toString();
      } catch (e) {}
    }

    var response = yield fetch(pageUrl, {
      'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': currentDomain + '/' })
    });
    var html = yield response.text();
    var $ = import_cheerio_without_node_native2.default.load(html);

    var pageTitle = $("h1.page-title span").text();
    var isMovie = pageTitle.toLowerCase().includes("movie");

    if (isMovie) {
      // --- MOVIE MODE ---
      var qualityLinks = $(".page-body > div a").filter(function(i, el) {
        return $(el).text().match(/480|720|1080|2160|4K/i);
      });

      var hubstreamLinks = $(".page-body > div a").filter(function(i, el) {
        var href = $(el).attr("href");
        return href && (href.includes("hubcloud.cx") || href.includes('hubstream'));
      });

      var allUrls = [...new Set([
        ...qualityLinks.map(function(i, el) { return $(el).attr("href"); }).get(),
        ...hubstreamLinks.map(function(i, el) { return $(el).attr("href"); }).get()
      ])];

      var linkResults = yield Promise.all(allUrls.map(function(link) {
        return loadExtractor(link, pageUrl);
      }));

      var flatLinks = linkResults.flat();

      // Deduplicate
      var seen = new Set();
      var uniqueLinks = flatLinks.filter(function(link) {
        if (!link.url || link.url.includes('.zip') || (link.fileName != null && link.fileName.toLowerCase().includes('.zip'))) return false;
        if (seen.has(link.url)) return false;
        seen.add(link.url);
        return true;
      });

      return { 'finalLinks': uniqueLinks, 'isMovie': isMovie };

    } else {
      // --- TV SHOW MODE ---
      var episodeMap = new Map();
      var directEpisodeUrls = [];

      $('h3, h4').each(function(i, el) {
        var $el = $(el);
        var text = $el.text();
        var links = $el.find('a');
        var urls = links.map(function(i, el) { return $(el).attr("href"); }).get();
        var linkTexts = links.get().map(function(el) { return $(el).text().match(/1080|720|4K|2160/i); }).filter(Boolean);

        if (linkTexts.length > 0) {
          directEpisodeUrls.push(...urls);
          return;
        }

        // Check for episode info
        var epMatch = text.match(/(?:EPiSODE\s*(\d+)|E(\d+))/i);
        if (epMatch) {
          var epNum = parseInt(epMatch[1] || epMatch[2]);
          if (!episodeMap.has(epNum)) episodeMap.set(epNum, []);
          episodeMap.get(epNum).push(...urls);

          var nextEl = $el.next();
          while (nextEl.length && nextEl.get(0).tagName !== 'hr') {
            var extraLinks = nextEl.find('a[href]').map(function(i, el) { return $(el).attr('href'); }).get();
            episodeMap.get(epNum).push(...extraLinks);
            nextEl = nextEl.next();
          }
        }
      });

      // Process direct episode URLs
      if (directEpisodeUrls.length > 0) {
        yield Promise.all(directEpisodeUrls.map(function(url) {
          return __async(this, null, function*() {
            try {
              var redirect = yield getRedirectLinks(url);
              if (!redirect) return;
              var page = yield fetch(redirect, { 'headers': HEADERS });
              var html = yield page.text();
              var $ = import_cheerio_without_node_native2.default.load(html);

              $("h3").each(function(i, el) {
                var text = $(el).text();
                var link = $(el).attr("href");
                var epMatch = text.match(/Episode\s*(\d+)/i);
                if (epMatch && link) {
                  var epNum = parseInt(epMatch[1]);
                  if (!episodeMap.has(epNum)) episodeMap.set(epNum, []);
                  episodeMap.get(epNum).push(link);
                }
              });
            } catch (e) {}
          });
        }));
      }

      // Build episode link list
      var episodeLinks = [];
      episodeMap.forEach(function(urls, epNum) {
        var uniqueUrls = [...new Set(urls)];
        episodeLinks.push(...uniqueUrls.map(function(u) {
          return { 'url': u, 'episode': epNum };
        }));
      });

      // Extract links for each episode
      var results = yield Promise.all(episodeLinks.map(function(item) {
        return __async(this, null, function*() {
          try {
            var links = yield loadExtractor(item.url, pageUrl);
            return links.map(function(l) {
              return __spreadProps(__spreadValues({}, l), { 'episode': item.episode });
            });
          } catch (e) { return []; }
        });
      }));

      var allLinks = results.flat();

      // Deduplicate
      var seen = new Set();
      var uniqueLinks = allLinks.filter(function(link) {
        if (!link.url || link.url.includes('.zip')) return false;
        if (seen.has(link.url)) return false;
        seen.add(link.url);
        return true;
      });

      return { 'finalLinks': uniqueLinks, 'isMovie': isMovie };
    }
  });
}

// ============================================================
// Main Entry Point: getStreams
// ============================================================
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function*() {
    console.log('[HDHub4u] Fetching streams for TMDB ID: ' + tmdbId + ", Type: " + mediaType);

    try {
      var tmdbInfo = yield getTMDBDetails(tmdbId, mediaType);
      console.log('[HDHub4u] TMDB Info: "' + tmdbInfo.title + '" (' + (tmdbInfo.year || 'N/A') + ')');

      var searchQuery = (mediaType === 'tv' && season)
        ? tmdbInfo.title + " Season " + season
        : tmdbInfo.title;

      var searchResults = yield search(searchQuery);
      if (searchResults.length === 0) return [];

      var bestMatch = findBestTitleMatch(tmdbInfo, searchResults, mediaType, season) || searchResults[0];
      console.log('[HDHub4u] Selected: "' + bestMatch.title + '" (url: ' + bestMatch.url + ')');

      var downloadData = yield getDownloadLinks(bestMatch.url);
      var links = downloadData.finalLinks;

      if (mediaType === 'tv' && episode !== null) {
        links = links.filter(function(l) { return l.episode === episode; });
      }

      var processed = links.map(function(link) {
        var fileName = link.fileName && link.fileName !== "Unknown" ? link.fileName : tmdbInfo.title;

        if (mediaType === 'tv' && season && episode) {
          fileName = tmdbInfo.title + ' S' + String(season).padStart(2, '0') + 'E' + String(episode).padStart(2, '0');
        }

        var serverName = extractServerName(link.source);

        var qualityLabel = 'Unknown';
        if (typeof link.quality === "number" && link.quality > 0) {
          if (link.quality >= 2160) qualityLabel = '4K';
          else if (link.quality >= 1080) qualityLabel = "1080p";
          else if (link.quality >= 720) qualityLabel = '720p';
          else if (link.quality >= 480) qualityLabel = '480p';
        } else if (typeof link.quality === "string") {
          qualityLabel = link.quality;
        }

        return {
          'name': "HDHub4u " + serverName,
          'title': fileName,
          'url': link.url,
          'quality': qualityLabel,
          'size': formatBytes(link.size),
          'headers': link.headers || undefined,
          'provider': ""
        };
      });

      // Sort by quality (4K > 1080p > 720p > 480p > Unknown)
      var qualityOrder = { '4K': 4, '1080p': 2, '720p': 1, '480p': 0, 'Unknown': -2 };
      processed.sort(function(a, b) {
        return (qualityOrder[b.quality] || -3) - (qualityOrder[a.quality] || -3);
      });

      return processed;

    } catch (err) {
      console.error('[HDHub4u] Scraping error: ' + err.message);
      return [];
    }
  });
}

module.exports = { 'getStreams': getStreams };
