// REFACTORED: Separated AppBar into container and presentation components
import React from 'react';
import { AppBarPresentation } from './AppBarPresentation';
import { useAppBarLogic } from '../hooks/useAppBarLogic';
import { AppBarProps } from '../types/AppBarTypes';

export function AppBarContainer(props: AppBarProps) {
  const {
    downloadMenuState,
    handleDownloadMenuToggle,
    handleDownloadAction,
    navigationActions,
    toolbarActions
  } = useAppBarLogic(props);

  return (
    <AppBarPresentation
      {...props}
      downloadMenuState={downloadMenuState}
      onDownloadMenuToggle={handleDownloadMenuToggle}
      onDownloadAction={handleDownloadAction}
      navigationActions={navigationActions}
      toolbarActions={toolbarActions}
    />
  );
}

// Separate hook for business logic
import { useState, useMemo } from 'react';

export function useAppBarLogic(props: AppBarProps) {
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);

  const downloadMenuState = {
    anchor: downloadMenuAnchor,
    open: Boolean(downloadMenuAnchor)
  };

  const handleDownloadMenuToggle = (event?: React.MouseEvent<HTMLButtonElement>) => {
    setDownloadMenuAnchor(event?.currentTarget || null);
  };

  const handleDownloadAction = (format: 'png' | 'json' | 'afb') => {
    props.onDownloadClick(format);
    setDownloadMenuAnchor(null);
  };

  const navigationActions = useMemo(() => [
    {
      id: 'new-search',
      label: 'New Analysis',
      onClick: props.onNewSearch,
      visible: true
    },
    {
      id: 'save-analysis',
      label: 'Save Analysis',
      onClick: props.onSaveClick,
      visible: props.showGraphActions
    },
    {
      id: 'load-analysis',
      label: 'Load Analysis',
      onClick: props.onLoadClick,
      visible: true
    }
  ], [props]);

  const toolbarActions = useMemo(() => [
    {
      id: 'export',
      label: 'Export',
      onClick: handleDownloadMenuToggle,
      visible: Boolean(props.exportFunction)
    },
    {
      id: 'advanced-viz',
      label: 'Advanced Visualization',
      onClick: props.onToggleAdvancedVisualization,
      active: props.enableAdvancedVisualization,
      visible: Boolean(props.onToggleAdvancedVisualization)
    },
    {
      id: 'filters',
      label: 'Filters',
      onClick: props.onToggleVisualizationFilters,
      active: props.showVisualizationFilters,
      visible: Boolean(props.onToggleVisualizationFilters)
    }
  ], [props, handleDownloadMenuToggle]);

  return {
    downloadMenuState,
    handleDownloadMenuToggle,
    handleDownloadAction,
    navigationActions,
    toolbarActions
  };
}