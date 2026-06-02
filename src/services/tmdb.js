import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = import.meta.env.VITE_TMDB_BASE_URL || 'https://api.themoviedb.org/3';

const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
});

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
export const BACKDROP_SIZE = 'original';
export const POSTER_SIZE = 'w500';

export const genreMap = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics"
};

const mapTmdbItem = (item, defaultType = 'movie') => {
  if (!item.backdrop_path && !item.poster_path) return null; 
  
  const type = item.media_type || defaultType;
  
  return {
    id: item.id,
    title: item.title || item.name || item.original_name,
    description: item.overview,
    type: type === 'tv' ? 'series' : type,
    genre: (item.genre_ids || []).map(id => genreMap[id]).filter(Boolean),
    year: (item.release_date || item.first_air_date || '').split('-')[0],
    rating: item.adult ? 'R' : 'PG-13', 
    duration: type === 'movie' ? '2h 10m' : '1 Season', 
    match: Math.round((item.vote_average || 0) * 10),
    backdrop: item.backdrop_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${item.backdrop_path}` : null,
    poster: item.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${item.poster_path}` : null,
  };
};

export const fetchTrending = async (page = 1) => {
  const { data } = await tmdb.get('/trending/all/day', { params: { page } });
  return data.results.map(i => mapTmdbItem(i)).filter(Boolean);
};

export const fetchMovies = async (category = 'popular', page = 1) => { 
  const { data } = await tmdb.get(`/movie/${category}`, { params: { page } });
  return data.results.map(i => mapTmdbItem(i, 'movie')).filter(Boolean);
};

export const fetchSeries = async (category = 'popular', page = 1) => { 
  const { data } = await tmdb.get(`/tv/${category}`, { params: { page } });
  return data.results.map(i => mapTmdbItem(i, 'series')).filter(Boolean);
};

export const discoverMovies = async (params = {}) => {
  const { data } = await tmdb.get('/discover/movie', { params });
  return data.results.map(i => mapTmdbItem(i, 'movie')).filter(Boolean);
};

export const discoverSeries = async (params = {}) => {
  const { data } = await tmdb.get('/discover/tv', { params });
  return data.results.map(i => mapTmdbItem(i, 'series')).filter(Boolean);
};

export const fetchAnime = async (page = 1) => {
  const { data } = await tmdb.get('/discover/tv', {
    params: {
      with_keywords: '210024',
      with_original_language: 'ja',
      page
    }
  });
  return data.results.map(i => mapTmdbItem(i, 'series')).filter(Boolean);
};

export const searchMulti = async (query, page = 1) => {
  const { data } = await tmdb.get('/search/multi', { params: { query, page } });
  return data.results.map(i => mapTmdbItem(i)).filter(Boolean);
};

export const fetchTrailer = async (id, type) => {
  try {
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    const { data } = await tmdb.get(`/${tmdbType}/${id}/videos`);
    const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    return trailer ? trailer.key : null;
  } catch {
    return null;
  }
};

export const fetchDetails = async (id, type) => {
  const tmdbType = type === 'series' ? 'tv' : 'movie';
  const endpoint = `/${tmdbType}/${id}`;
  const { data } = await tmdb.get(endpoint, {
    params: { append_to_response: 'credits,similar,videos' }
  });
  
  const mapped = mapTmdbItem(data, type);
  mapped.cast = (data.credits?.cast || []).slice(0, 5).map(c => c.name);
  mapped.director = (data.credits?.crew || []).find(c => c.job === 'Director')?.name;
  
  if (tmdbType === 'movie') {
    mapped.duration = data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : mapped.duration;
  } else {
    mapped.seasons = data.number_of_seasons;
    mapped.episodes = data.number_of_episodes;
    mapped.seasonsList = data.seasons;
  }
  
  const trailer = (data.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
  if (trailer) {
    mapped.trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    mapped.youtubeKey = trailer.key;
  }

  mapped.similar = (data.similar?.results || []).map(i => mapTmdbItem(i, type)).filter(Boolean);
  
  return mapped;
};

export const fetchSeasonDetails = async (tvId, seasonNumber) => {
  const { data } = await tmdb.get(`/tv/${tvId}/season/${seasonNumber}`);
  return data;
};

export const getMovieGenres = async () => {
  const { data } = await tmdb.get('/genre/movie/list');
  return data.genres;
};

export const getTvGenres = async () => {
  const { data } = await tmdb.get('/genre/tv/list');
  return data.genres;
};
