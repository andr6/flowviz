import {
  Box,
  InputLabel,
} from '@mui/material';
import React from 'react';

import { 
  DropdownFormControl, 
  DropdownSelect, 
  DropdownMenuItem, 
  dropdownMenuStyles 
} from '../../../../shared/components/Dropdown';
import { SearchInputWithClear } from '../../../../shared/components/SearchInput';

interface SearchAndFiltersProps {
  searchTerm: string;
  sortBy: 'date' | 'title' | 'nodes';
  onSearchChange: (value: string) => void;
  onSortChange: (sortBy: 'date' | 'title' | 'nodes') => void;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchTerm,
  sortBy,
  onSearchChange,
  onSortChange,
}) => {
  return (
    <>
      {/* Search and Sort */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <SearchInputWithClear
          placeholder="Search flows..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          size="small"
          sx={{
            flex: 1,
            minWidth: '200px',
          }}
        />
        
        <DropdownFormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <DropdownSelect
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'date' | 'title' | 'nodes')}
            label="Sort by"
            MenuProps={dropdownMenuStyles}
          >
            <DropdownMenuItem value="date">
              Date
            </DropdownMenuItem>
            <DropdownMenuItem value="title">
              Title
            </DropdownMenuItem>
            <DropdownMenuItem value="nodes">
              Size
            </DropdownMenuItem>
          </DropdownSelect>
        </DropdownFormControl>
      </Box>

    </>
  );
};

export default SearchAndFilters;