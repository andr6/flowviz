/**
 * Density System Examples
 *
 * Demonstrates how to use the density system in various components.
 * These examples show best practices for implementing density-aware UI.
 */

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  Grid,
  Stack,
} from '@mui/material';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import {
  useDensity,
  useDensityStyles,
  useDensitySpacing,
  useDensityFontSize,
  useDensityValue,
  useDensityClass,
} from '../../context/DensityContext';
import { densityToMuiSize } from '../../theme/density';

// =====================================================
// EXAMPLE 1: BASIC DENSITY-AWARE CARD
// =====================================================

/**
 * DensityAwareCard
 *
 * Demonstrates basic density usage with theme values.
 */
export function DensityAwareCard() {
  const { theme } = useDensity();

  return (
    <Card>
      <CardContent
        sx={{
          padding: `${theme.componentPadding}px !important`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: theme.fontSize.lg,
            lineHeight: theme.lineHeight,
            marginBottom: `${theme.spacing.sm}px`,
          }}
        >
          Density-Aware Card
        </Typography>

        <Typography
          variant="body2"
          sx={{
            fontSize: theme.fontSize.md,
            lineHeight: theme.lineHeight,
            marginBottom: `${theme.spacing.md}px`,
          }}
        >
          This card adapts its padding, font sizes, and spacing based on the current density level.
        </Typography>

        <Box sx={{ display: 'flex', gap: `${theme.spacing.sm}px` }}>
          <Button
            variant="contained"
            sx={{
              paddingLeft: `${theme.button.paddingX}px`,
              paddingRight: `${theme.button.paddingX}px`,
              paddingTop: `${theme.button.paddingY}px`,
              paddingBottom: `${theme.button.paddingY}px`,
              fontSize: theme.button.fontSize,
              height: `${theme.button.height}px`,
              minWidth: `${theme.button.minWidth}px`,
            }}
          >
            Action
          </Button>

          <Button
            variant="outlined"
            sx={{
              paddingLeft: `${theme.button.paddingX}px`,
              paddingRight: `${theme.button.paddingX}px`,
              paddingTop: `${theme.button.paddingY}px`,
              paddingBottom: `${theme.button.paddingY}px`,
              fontSize: theme.button.fontSize,
              height: `${theme.button.height}px`,
              minWidth: `${theme.button.minWidth}px`,
            }}
          >
            Cancel
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXAMPLE 2: MATERIAL-UI SIZE INTEGRATION
// =====================================================

/**
 * DensityMuiComponents
 *
 * Demonstrates using densityToMuiSize for Material-UI components.
 */
export function DensityMuiComponents() {
  const { density, theme } = useDensity();
  const muiSize = densityToMuiSize(density);

  return (
    <Card>
      <CardContent sx={{ padding: `${theme.componentPadding}px !important` }}>
        <Typography variant="h6" sx={{ fontSize: theme.fontSize.lg, mb: 2 }}>
          Material-UI Integration
        </Typography>

        <Stack spacing={theme.spacing.md / 8}>
          <TextField
            size={muiSize}
            label="Adaptive Input"
            placeholder="Adapts to density"
            fullWidth
          />

          <Box display="flex" gap={theme.spacing.sm / 8}>
            <Button variant="contained" size={muiSize}>
              Submit
            </Button>
            <Button variant="outlined" size={muiSize}>
              Cancel
            </Button>
          </Box>

          <Box display="flex" gap={theme.spacing.xs / 8} flexWrap="wrap">
            <Chip label="Tag 1" size={muiSize} />
            <Chip label="Tag 2" size={muiSize} />
            <Chip label="Tag 3" size={muiSize} />
          </Box>

          <Box display="flex" gap={theme.spacing.xs / 8}>
            <IconButton size={muiSize}>
              <Add />
            </IconButton>
            <IconButton size={muiSize}>
              <Edit />
            </IconButton>
            <IconButton size={muiSize}>
              <Delete />
            </IconButton>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXAMPLE 3: DENSITY-AWARE TABLE
// =====================================================

/**
 * DensityAwareTable
 *
 * Demonstrates table with adaptive row height and cell padding.
 */
export function DensityAwareTable() {
  const { theme } = useDensity();
  const tableStyles = useDensityStyles('table');

  const data = [
    { id: 1, name: 'Technique T1566', severity: 'High', status: 'Active' },
    { id: 2, name: 'Technique T1059', severity: 'Critical', status: 'Mitigated' },
    { id: 3, name: 'Technique T1003', severity: 'Medium', status: 'Active' },
  ];

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ height: `${tableStyles.rowHeight}px` }}>
            <TableCell
              sx={{
                paddingLeft: `${tableStyles.cellPaddingX}px`,
                paddingRight: `${tableStyles.cellPaddingX}px`,
                paddingTop: `${tableStyles.cellPaddingY}px`,
                paddingBottom: `${tableStyles.cellPaddingY}px`,
                fontSize: tableStyles.fontSize,
              }}
            >
              Technique
            </TableCell>
            <TableCell
              sx={{
                paddingLeft: `${tableStyles.cellPaddingX}px`,
                paddingRight: `${tableStyles.cellPaddingX}px`,
                paddingTop: `${tableStyles.cellPaddingY}px`,
                paddingBottom: `${tableStyles.cellPaddingY}px`,
                fontSize: tableStyles.fontSize,
              }}
            >
              Severity
            </TableCell>
            <TableCell
              sx={{
                paddingLeft: `${tableStyles.cellPaddingX}px`,
                paddingRight: `${tableStyles.cellPaddingX}px`,
                paddingTop: `${tableStyles.cellPaddingY}px`,
                paddingBottom: `${tableStyles.cellPaddingY}px`,
                fontSize: tableStyles.fontSize,
              }}
            >
              Status
            </TableCell>
            <TableCell
              sx={{
                paddingLeft: `${tableStyles.cellPaddingX}px`,
                paddingRight: `${tableStyles.cellPaddingX}px`,
                paddingTop: `${tableStyles.cellPaddingY}px`,
                paddingBottom: `${tableStyles.cellPaddingY}px`,
                fontSize: tableStyles.fontSize,
              }}
            >
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} sx={{ height: `${tableStyles.rowHeight}px` }}>
              <TableCell sx={{ fontSize: tableStyles.fontSize, p: `${tableStyles.cellPaddingY}px ${tableStyles.cellPaddingX}px` }}>
                {row.name}
              </TableCell>
              <TableCell sx={{ fontSize: tableStyles.fontSize, p: `${tableStyles.cellPaddingY}px ${tableStyles.cellPaddingX}px` }}>
                <Chip
                  label={row.severity}
                  size="small"
                  color={row.severity === 'Critical' ? 'error' : row.severity === 'High' ? 'warning' : 'default'}
                  sx={{
                    height: `${theme.chip.height}px`,
                    fontSize: theme.chip.fontSize,
                  }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: tableStyles.fontSize, p: `${tableStyles.cellPaddingY}px ${tableStyles.cellPaddingX}px` }}>
                {row.status}
              </TableCell>
              <TableCell sx={{ fontSize: tableStyles.fontSize, p: `${tableStyles.cellPaddingY}px ${tableStyles.cellPaddingX}px` }}>
                <IconButton size="small">
                  <Visibility sx={{ fontSize: theme.icon.size.sm }} />
                </IconButton>
                <IconButton size="small">
                  <Edit sx={{ fontSize: theme.icon.size.sm }} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// =====================================================
// EXAMPLE 4: RESPONSIVE GRID
// =====================================================

/**
 * DensityResponsiveGrid
 *
 * Demonstrates grid with adaptive columns based on density.
 */
export function DensityResponsiveGrid() {
  const spacing = useDensitySpacing();

  // More columns in compact mode, fewer in spacious
  const columns = useDensityValue({
    compact: 4,
    comfortable: 3,
    spacious: 2,
  });

  const items = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    title: `Item ${i + 1}`,
    description: 'Sample content',
  }));

  return (
    <Grid container spacing={spacing.md / 8}>
      {items.map((item) => (
        <Grid item xs={12} sm={12 / columns} key={item.id}>
          <Paper sx={{ p: spacing.sm / 8, textAlign: 'center' }}>
            <Typography variant="subtitle2">{item.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {item.description}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

// =====================================================
// EXAMPLE 5: CSS CLASS NAME APPROACH
// =====================================================

/**
 * DensityClassNameExample
 *
 * Demonstrates using CSS class names for density.
 */
export function DensityClassNameExample() {
  const className = useDensityClass('custom-component');

  return (
    <div className={className}>
      <style>
        {`
          .custom-component {
            background: #f5f5f5;
            border-radius: 4px;
          }

          .custom-component--compact {
            padding: 8px;
            font-size: 12px;
          }

          .custom-component--comfortable {
            padding: 16px;
            font-size: 14px;
          }

          .custom-component--spacious {
            padding: 24px;
            font-size: 18px;
          }
        `}
      </style>

      <Typography>
        This component uses CSS class names for density-aware styling.
      </Typography>
    </div>
  );
}

// =====================================================
// EXAMPLE 6: CUSTOM HOOK USAGE
// =====================================================

/**
 * DensityCustomHooksExample
 *
 * Demonstrates all available density hooks.
 */
export function DensityCustomHooksExample() {
  const { density, isCompact, isComfortable, isSpaciou } = useDensity();
  const buttonStyles = useDensityStyles('button');
  const spacing = useDensitySpacing();
  const fontSize = useDensityFontSize();

  const itemsPerPage = useDensityValue({
    compact: 20,
    comfortable: 15,
    spacious: 10,
  });

  return (
    <Card>
      <CardContent sx={{ padding: `${spacing.md}px !important` }}>
        <Typography variant="h6" sx={{ fontSize: fontSize.lg, mb: spacing.sm / 8 }}>
          Density Hooks Demo
        </Typography>

        <Stack spacing={spacing.sm / 8}>
          <Typography variant="body2" sx={{ fontSize: fontSize.md }}>
            Current Density: <strong>{density}</strong>
          </Typography>

          <Typography variant="body2" sx={{ fontSize: fontSize.md }}>
            Flags: {isCompact && 'Compact'} {isComfortable && 'Comfortable'} {isSpaciou && 'Spacious'}
          </Typography>

          <Typography variant="body2" sx={{ fontSize: fontSize.md }}>
            Items per page: <strong>{itemsPerPage}</strong>
          </Typography>

          <Typography variant="body2" sx={{ fontSize: fontSize.md }}>
            Button height: <strong>{buttonStyles.height}px</strong>
          </Typography>

          <Typography variant="body2" sx={{ fontSize: fontSize.md }}>
            Spacing MD: <strong>{spacing.md}px</strong>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXAMPLE 7: DENSITY-AWARE FORM
// =====================================================

/**
 * DensityAwareForm
 *
 * Demonstrates form with adaptive fields.
 */
export function DensityAwareForm() {
  const { density, theme } = useDensity();
  const muiSize = densityToMuiSize(density);

  return (
    <Card>
      <CardContent sx={{ padding: `${theme.componentPadding}px !important` }}>
        <Typography variant="h6" sx={{ fontSize: theme.fontSize.lg, mb: 2 }}>
          Adaptive Form
        </Typography>

        <Stack spacing={theme.spacing.md / 8}>
          <TextField
            size={muiSize}
            label="Name"
            placeholder="Enter your name"
            fullWidth
          />

          <TextField
            size={muiSize}
            label="Email"
            type="email"
            placeholder="Enter your email"
            fullWidth
          />

          <TextField
            size={muiSize}
            label="Message"
            multiline
            rows={density === 'compact' ? 2 : density === 'spacious' ? 6 : 4}
            placeholder="Enter your message"
            fullWidth
          />

          <Box display="flex" justifyContent="flex-end" gap={theme.spacing.sm / 8}>
            <Button variant="outlined" size={muiSize}>
              Cancel
            </Button>
            <Button variant="contained" size={muiSize}>
              Submit
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXAMPLE SHOWCASE COMPONENT
// =====================================================

/**
 * DensityExamplesShowcase
 *
 * Displays all density examples in a grid.
 */
export function DensityExamplesShowcase() {
  const spacing = useDensitySpacing();

  return (
    <Box sx={{ p: spacing.lg / 8 }}>
      <Typography variant="h4" gutterBottom>
        Density System Examples
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        These examples demonstrate various approaches to implementing density-aware UI components.
      </Typography>

      <Grid container spacing={spacing.md / 8}>
        <Grid item xs={12} md={6}>
          <DensityAwareCard />
        </Grid>

        <Grid item xs={12} md={6}>
          <DensityMuiComponents />
        </Grid>

        <Grid item xs={12}>
          <DensityAwareTable />
        </Grid>

        <Grid item xs={12} md={6}>
          <DensityCustomHooksExample />
        </Grid>

        <Grid item xs={12} md={6}>
          <DensityAwareForm />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Responsive Grid (Columns adapt to density)
          </Typography>
          <DensityResponsiveGrid />
        </Grid>
      </Grid>
    </Box>
  );
}

// =====================================================
// EXPORTS
// =====================================================

export default DensityExamplesShowcase;

export {
  DensityAwareCard,
  DensityMuiComponents,
  DensityAwareTable,
  DensityResponsiveGrid,
  DensityClassNameExample,
  DensityCustomHooksExample,
  DensityAwareForm,
};
