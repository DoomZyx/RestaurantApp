import { useState } from "react";
import "./searchBar.scss";
import { useSearch } from "../../Hooks/Search/useSearch";
import SearchResults from "./SearchResults.jsx";

function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const {
    searchResults,
    loading,
    error,
    hasSearched,
    searchCalls,
    clearSearch,
  } = useSearch();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchCalls(searchTerm);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    // Effacer les résultats si l'input devient vide
    if (!e.target.value.trim()) {
      clearSearch();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const handleCloseResults = () => {
    clearSearch();
    setSearchTerm("");
  };

  return (
    <>
      <div className="searchbar" style={{ width: "100%", textAlign: "center" }}>
        <form onSubmit={handleSubmit}>
          <label htmlFor="search-input" style={{ visibility: "hidden" }}>
            Rechercher
          </label>
          <input
            id="search-input"
            className="input"
            type="search"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          <button type="submit" disabled={!searchTerm.trim() || loading}>
            <i
              className={
                loading ? "bi bi-arrow-repeat rotating" : "bi bi-search"
              }
            ></i>
          </button>
        </form>
      </div>

      <SearchResults
        results={searchResults}
        loading={loading}
        error={error}
        hasSearched={hasSearched}
        onClose={handleCloseResults}
      />
    </>
  );
}

export default SearchBar;
