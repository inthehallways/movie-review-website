const axios = require('axios');
const sql = require('mssql');

// TMDB Configuration
const API_KEY = "SECRET_NO_CLUE";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

// Database Configuration
//Removed for privacy

async function processMovies(movies, ps) {
    for (const [index, movie] of movies.entries()) {
        try {
            // Fetch detailed movie info (including credits for director)
            const detailsResponse = await axios.get(
                `${BASE_URL}/movie/${movie.id}?api_key=${API_KEY}&append_to_response=credits`
            );
            const details = detailsResponse.data;

            // Extract director name
            const director = details.credits.crew.find(p => p.job === 'Director')?.name || 'Unknown';

            // Format genres as comma-separated string
            const genres = details.genres?.map(g => g.name).join(', ') || 'Unknown';

            // Prepare parameters for database
            const params = {
                movie_id: movie.id, // Use TMDB's id directly
                title: movie.title || 'Untitled',
                release_date: movie.release_date || null,
                description: details.overview || 'No description available',
                poster_url: movie.poster_path ? `${IMG_URL}${movie.poster_path}` : null,
                genre: genres,
                director: director,
                backdrop_url: movie.backdrop_path ? `${IMG_URL}${movie.backdrop_path}` : null
            };

            // Execute upsert (MERGE)
            await ps.execute(params);
            console.log(`✅ [${index + 1}/${movies.length}] Inserted: ${movie.title} (ID: ${movie.id})`);

            // Rate limiting: 200ms delay between API calls
            if (index < movies.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (err) {
            console.error(`❌ Error processing "${movie.title}" (ID: ${movie.id}):`, err.message);
        }
    }
}

async function fetchAndStoreMovies() {
    let pool;
    let ps;
    try {
        // Create connection pool
        pool = await sql.connect(dbConfig);
        console.log("✅ Connected to SQL Server");

        // Fetch popular movies
        // Get the first page to find out how many pages in total
        const firstPageResponse = await axios.get(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=1`);
        const totalPages = firstPageResponse.data.total_pages;

        console.log(`ℹ️ Total pages to fetch: ${totalPages}`);


        // Prepare statement
        ps = new sql.PreparedStatement(pool);
        ps.input('movie_id', sql.Int);
        ps.input('title', sql.NVarChar(255));
        ps.input('release_date', sql.Date);
        ps.input('description', sql.NText);
        ps.input('poster_url', sql.NVarChar(500));
        ps.input('genre', sql.NVarChar(100));
        ps.input('director', sql.NVarChar(255));
        ps.input('backdrop_url', sql.NVarChar(500));

       await ps.prepare(`
            MERGE INTO movies AS target
            USING (VALUES (@movie_id, @title, @release_date, @description, @poster_url, @genre, @director, @backdrop_url)) 
                AS source (movie_id, title, release_date, description, poster_url, genre, director, backdrop_url)
            ON target.movie_id = source.movie_id
            WHEN MATCHED THEN 
                UPDATE SET
                    title = source.title,
                    release_date = source.release_date,
                    description = source.description,
                    poster_url = source.poster_url,
                    genre = source.genre,
                    director = source.director,
                    backdrop_url = source.backdrop_url,
                    updated_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (movie_id, title, release_date, description, poster_url, genre, director, backdrop_url, created_at)
                VALUES (source.movie_id, source.title, source.release_date, source.description, source.poster_url, source.genre, source.director, source.backdrop_url, GETDATE());
        `);

          for (let page = 1; page <= totalPages; page++) {
            console.log(`🔄 Fetching page ${page}...`);
            const response = await axios.get(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${page}`);
            const movies = response.data.results;

            
        // Process movies with rate limiting
        for (const [index, movie] of movies.entries()) {
            try {
                // Get detailed info
                const detailsResponse = await axios.get(
                    `${BASE_URL}/movie/${movie.id}?api_key=${API_KEY}&append_to_response=credits`
                );
                const details = detailsResponse.data;

                // Extract director
                const director = details.credits.crew.find(p => p.job === 'Director')?.name || 'Unknown';
                
                // Format genres
                const genres = details.genres?.map(g => g.name).join(', ') || 'Unknown';

                // Prepare parameters
                const params = {
                    movie_id: movie.id, // Set movie_id from TMDB
                    title: movie.title || 'Untitled',
                    release_date: movie.release_date || null,
                    description: details.overview || 'No description available',
                    poster_url: movie.poster_path ? `${IMG_URL}${movie.poster_path}` : null,
                    genre: genres,
                    director: director,
                    backdrop_url: movie.backdrop_path ? `${IMG_URL}${movie.backdrop_path}` : null
                };

                // Execute insert
                await ps.execute(params);
                console.log(`✅ [${index + 1}/${movies.length}] Inserted: ${movie.title} (ID: ${movie.id})`);

                // Rate limiting - wait 200ms between requests
                if (index < movies.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

            } catch (innerErr) {
                console.error(`❌ Error processing "${movie.title}":`, innerErr.message);
            }
        }
    }

        console.log('✅ All movies processed successfully.');

    } catch (err) {
        console.error('❌ Fatal error:', err.message);
    } finally {
        // Clean up resources
        if (ps) {
            try {
                await ps.unprepare();
            } catch (unprepErr) {
                console.error('❌ Unprepare error:', unprepErr.message);
            }
        }
        if (pool) {
            try {
                await pool.close();
                console.log("✅ Connection closed");
            } catch (cleanupErr) {
                console.error("❌ Cleanup error:", cleanupErr.message);
            }
        }
    }
}

// Execute
fetchAndStoreMovies();