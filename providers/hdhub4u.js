// ============================================================
// HDHub4u.js - Fully Deobfuscated & Readable
// ============================================================
//
// Fetches page links from cluster.watchkar.com API, then extracts
// download/stream links using the same file-host extractors.
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
// Imports
// ============================================================
var import_cheerio_without_node_native = __toESM(require('cheerio-without-node-native'));
var import_crypto_js = __toESM(require('crypto-js'));

// ============================================================
// Constants
// ============================================================
var CLUSTER_API_BASE = 'https://cluster.watchkar.com/hdhub.php';
var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  'Cookie': 'xla=s4t'
};

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
    referer = referer || '';
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
// Constants for quality ordering
// ============================================================
var QUALITY_ORDER = { '4K': 4, '1080p': 2, '720p': 1, '480p': 0, 'Unknown': -2 };

// ============================================================
// Parse quality string to label
// ============================================================
function parseQualityLabel(quality) {
  if (typeof quality === "number" && quality > 0) {
    if (quality >= 2160) return '4K';
    if (quality >= 1080) return "1080p";
    if (quality >= 720) return '720p';
    if (quality >= 480) return '480p';
  } else if (typeof quality === "string") {
    return quality;
  }
  return 'Unknown';
}

// ============================================================
// Fetch page links from cluster API
// ============================================================
function fetchPageLinks(tmdbId, mediaType, season, episode) {
  return __async(this, null, function*() {
    var url = CLUSTER_API_BASE + '?id=' + encodeURIComponent(tmdbId) + '&type=' + encodeURIComponent(mediaType);

    if (season != null) url += '&season=' + encodeURIComponent(season);
    if (episode != null) url += '&episode=' + encodeURIComponent(episode);

    var response = yield fetch(url, { 'headers': HEADERS });
    if (!response.ok) throw new Error('Cluster API error: ' + response.status);
    return yield response.json();
  });
}

// ============================================================
// Main Entry Point: getStreams
// ============================================================
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function*() {
    console.log('[HDHub4u] Fetching streams for TMDB ID: ' + tmdbId + ", Type: " + mediaType);

    try {
      // 1. Fetch page links from cluster API
      var apiItems = yield fetchPageLinks(tmdbId, mediaType, season, episode);
      if (!apiItems || apiItems.length === 0) {
        console.log('[HDHub4u] No results from cluster API');
        return [];
      }

      console.log('[HDHub4u] Received ' + apiItems.length + ' items from cluster API');

      // 2. Separate pageLink items (need extraction) from final items
      var pageLinkItems = [];
      var finalItems = [];

      for (var item of apiItems) {
        if (item.pageLink === true) {
          pageLinkItems.push(item);
        } else {
          finalItems.push(item);
        }
      }

      console.log('[HDHub4u] ' + pageLinkItems.length + ' page links to extract, ' + finalItems.length + ' final links');

      // 3. Run extractors on pageLink URLs
      var extractedResults = yield Promise.all(pageLinkItems.map(function(item) {
        return __async(this, null, function*() {
          try {
            var referer = (item.headers && item.headers.Referer) || '';
            var links = yield loadExtractor(item.url, referer);
            // Attach episode info if coming from API item
            return links.map(function(l) {
              return __spreadProps(__spreadValues({}, l), {
                'episode': item.episode
              });
            });
          } catch (e) { return []; }
        });
      }));

      var allExtracted = extractedResults.flat();

      // 4. Convert final items to internal format (keep as-is)
      var allLinks = allExtracted.concat(finalItems);

      // 5. Filter by episode if TV (only when API didn't already filter)
      if (mediaType === 'tv' && episode != null) {
        var hasEpisodeData = allLinks.some(function(l) { return l.episode != null; });
        if (hasEpisodeData) {
          allLinks = allLinks.filter(function(l) { return l.episode === episode; });
        }
      }

      // 6. Deduplicate
      var seen = new Set();
      var uniqueLinks = allLinks.filter(function(link) {
        if (!link.url) return false;
        if (seen.has(link.url)) return false;
        seen.add(link.url);
        return true;
      });

      // 7. Format output
      var processed = uniqueLinks.map(function(link) {
        var serverName = extractServerName(link.source || link.name || '');
        var qualityLabel = parseQualityLabel(link.quality);
        var title = link.title || link.fileName || 'Unknown';

        if (mediaType === 'tv' && season != null && episode != null) {
          title = 'TMDB:' + tmdbId + ' S' + String(season).padStart(2, '0') + 'E' + String(episode).padStart(2, '0');
        }

        return {
          'name': "HDHub4u " + serverName,
          'title': title,
          'url': link.url,
          'quality': qualityLabel,
          'size': formatBytes(link.size),
          'headers': link.headers || undefined,
          'provider': "HDHUB4u"
        };
      });

      // 8. Sort by quality (4K > 1080p > 720p > 480p > Unknown)
      processed.sort(function(a, b) {
        return (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3);
      });

      return processed;

    } catch (err) {
      console.error('[HDHub4u] Scraping error: ' + err.message);
      return [];
    }
  });
}

module.exports = { 'getStreams': getStreams };
