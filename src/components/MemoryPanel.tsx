import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Chip,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { memoryService } from '../services/memoryService';

/**
 * Interface for memory node display
 */
interface MemoryNode {
  id: string;
  content: string;
  context?: string;
  confidence: number;
  importance: number;
  createdAt: string;
  lastAccessedAt: string;
  accessCount: number;
  type?: string;
  tags?: string[];
  relatedNodes?: string[];
}

/**
 * Interface for filter state
 */
interface FilterState {
  type: string;
  minConfidence: number;
  minImportance: number;
  sortBy: 'confidence' | 'importance' | 'recent' | 'accessCount';
}

/**
 * MemoryPanel Component
 * 
 * Manages and displays neural memory graph nodes with:
 * - Search functionality
 * - Confidence and importance scoring
 * - Advanced filtering
 * - Delete capabilities
 * - Real-time synchronization
 */
const MemoryPanel: React.FC = () => {
  // State management
  const [memoryNodes, setMemoryNodes] = useState<MemoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    minConfidence: 0,
    minImportance: 0,
    sortBy: 'recent',
  });
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memoryTypes, setMemoryTypes] = useState<string[]>([]);

  /**
   * Load memory nodes on component mount and set up polling
   */
  useEffect(() => {
    loadMemoryNodes();
    
    // Set up polling for real-time updates
    const pollingInterval = setInterval(() => {
      loadMemoryNodes();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(pollingInterval);
  }, []);

  /**
   * Load memory nodes from the memory service
   */
  const loadMemoryNodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const nodes = await memoryService.getAllNodes();
      setMemoryNodes(nodes);

      // Extract unique memory types
      const types = Array.from(
        new Set(nodes.map((node) => node.type).filter(Boolean))
      );
      setMemoryTypes(types);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load memory nodes';
      setError(errorMessage);
      console.error('Error loading memory nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter and search memory nodes
   */
  const filteredNodes = useMemo(() => {
    let result = [...memoryNodes];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (node) =>
          node.content.toLowerCase().includes(query) ||
          (node.context && node.context.toLowerCase().includes(query)) ||
          (node.tags && node.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    // Apply type filter
    if (filters.type !== 'all') {
      result = result.filter((node) => node.type === filters.type);
    }

    // Apply confidence filter
    result = result.filter((node) => node.confidence >= filters.minConfidence);

    // Apply importance filter
    result = result.filter((node) => node.importance >= filters.minImportance);

    // Apply sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'importance':
          return b.importance - a.importance;
        case 'accessCount':
          return b.accessCount - a.accessCount;
        case 'recent':
        default:
          return (
            new Date(b.lastAccessedAt).getTime() -
            new Date(a.lastAccessedAt).getTime()
          );
      }
    });

    return result;
  }, [memoryNodes, searchQuery, filters]);

  /**
   * Handle node deletion
   */
  const handleDeleteNode = async (nodeId: string) => {
    setNodeToDelete(nodeId);
    setDeleteDialogOpen(true);
  };

  /**
   * Confirm and execute node deletion
   */
  const confirmDelete = async () => {
    if (!nodeToDelete) return;

    try {
      await memoryService.deleteNode(nodeToDelete);
      setMemoryNodes((prev) => prev.filter((node) => node.id !== nodeToDelete));
      setDeleteDialogOpen(false);
      setNodeToDelete(null);
      setSelectedNode(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete memory node';
      setError(errorMessage);
      console.error('Error deleting memory node:', err);
    }
  };

  /**
   * Clear search and reset filters
   */
  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      type: 'all',
      minConfidence: 0,
      minImportance: 0,
      sortBy: 'recent',
    });
  };

  /**
   * Calculate confidence color
   */
  const getConfidenceColor = (confidence: number): 'error' | 'warning' | 'success' => {
    if (confidence < 0.5) return 'error';
    if (confidence < 0.75) return 'warning';
    return 'success';
  };

  /**
   * Calculate importance color
   */
  const getImportanceColor = (importance: number): 'inherit' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    if (importance < 0.5) return 'inherit';
    if (importance < 0.75) return 'warning';
    return 'error';
  };

  /**
   * Format date string
   */
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Neural Memory Graph
      </Typography>

      {/* Error Display */}
      {error && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: '#ffebee',
            borderLeft: '4px solid #f44336',
          }}
        >
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {/* Controls Section */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Search & Filter" />
        <CardContent>
          <Grid container spacing={2}>
            {/* Search Input */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="Search memory nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
                variant="outlined"
                size="small"
              />
            </Grid>

            {/* Type Filter */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Memory Type</InputLabel>
                <Select
                  value={filters.type}
                  label="Memory Type"
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {memoryTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Confidence Filter */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Min Confidence"
                value={filters.minConfidence}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minConfidence: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)),
                  })
                }
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                variant="outlined"
                size="small"
              />
            </Grid>

            {/* Importance Filter */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Min Importance"
                value={filters.minImportance}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minImportance: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)),
                  })
                }
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                variant="outlined"
                size="small"
              />
            </Grid>

            {/* Sort By */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy}
                  label="Sort By"
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      sortBy: e.target.value as FilterState['sortBy'],
                    })
                  }
                >
                  <MenuItem value="recent">Most Recent</MenuItem>
                  <MenuItem value="confidence">Highest Confidence</MenuItem>
                  <MenuItem value="importance">Highest Importance</MenuItem>
                  <MenuItem value="accessCount">Most Accessed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadMemoryNodes}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                color="inherit"
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Memory Nodes Grid */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2}>
        {filteredNodes.length > 0 ? (
          filteredNodes.map((node) => (
            <Grid item xs={12} sm={6} md={4} key={node.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                  },
                  backgroundColor: selectedNode?.id === node.id ? '#f5f5f5' : undefined,
                  border: selectedNode?.id === node.id ? '2px solid #1976d2' : undefined,
                }}
                onClick={() => setSelectedNode(node)}
              >
                <CardHeader
                  title={
                    <Typography
                      variant="subtitle1"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '85%',
                      }}
                    >
                      {node.content}
                    </Typography>
                  }
                  action={
                    <Tooltip title="Delete memory node">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  }
                  subheader={node.type || 'Unknown Type'}
                  subheaderTypographyProps={{ variant: 'caption' }}
                />

                <CardContent sx={{ flex: 1 }}>
                  {/* Context */}
                  {node.context && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {node.context}
                    </Typography>
                  )}

                  {/* Scores */}
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {/* Confidence Score */}
                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          Confidence
                        </Typography>
                        <Chip
                          label={`${(node.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(node.confidence)}
                          variant="outlined"
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={node.confidence * 100}
                        sx={{ height: 6 }}
                      />
                    </Box>

                    {/* Importance Score */}
                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          Importance
                        </Typography>
                        <Chip
                          label={`${(node.importance * 100).toFixed(0)}%`}
                          size="small"
                          color={getImportanceColor(node.importance) as any}
                          variant="outlined"
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={node.importance * 100}
                        sx={{ height: 6 }}
                      />
                    </Box>
                  </Stack>

                  {/* Tags */}
                  {node.tags && node.tags.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                      {node.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                      {node.tags.length > 3 && (
                        <Chip label={`+${node.tags.length - 3}`} size="small" />
                      )}
                    </Stack>
                  )}

                  {/* Metadata */}
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="textSecondary">
                      Access Count: {node.accessCount}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Created: {formatDate(node.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Last Accessed: {formatDate(node.lastAccessedAt)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="textSecondary">
                {searchQuery || Object.values(filters).some((v) => v !== 'all' && v !== 0 && v !== 'recent')
                  ? 'No memory nodes match your filters.'
                  : 'No memory nodes available.'}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Memory Node</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this memory node? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Node Details Sidebar */}
      {selectedNode && (
        <Paper
          sx={{
            position: 'fixed',
            right: 0,
            top: 0,
            width: 350,
            height: '100vh',
            overflowY: 'auto',
            p: 3,
            boxShadow: 3,
            backgroundColor: '#fafafa',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              from: { transform: 'translateX(100%)' },
              to: { transform: 'translateX(0)' },
            },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Node Details</Typography>
            <IconButton
              size="small"
              onClick={() => setSelectedNode(null)}
            >
              <ClearIcon />
            </IconButton>
          </Stack>

          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" fontWeight="bold" color="textSecondary">
                ID
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {selectedNode.id}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" fontWeight="bold" color="textSecondary">
                Content
              </Typography>
              <Typography variant="body2">{selectedNode.content}</Typography>
            </Box>

            {selectedNode.context && (
              <Box>
                <Typography variant="caption" fontWeight="bold" color="textSecondary">
                  Context
                </Typography>
                <Typography variant="body2">{selectedNode.context}</Typography>
              </Box>
            )}

            <Box>
              <Typography variant="caption" fontWeight="bold" color="textSecondary">
                Type
              </Typography>
              <Typography variant="body2">{selectedNode.type || 'N/A'}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" fontWeight="bold" color="textSecondary" display="block" sx={{ mb: 1 }}>
                Confidence: {(selectedNode.confidence * 100).toFixed(2)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={selectedNode.confidence * 100}
              />
            </Box>

            <Box>
              <Typography variant="caption" fontWeight="bold" color="textSecondary" display="block" sx={{ mb: 1 }}>
                Importance: {(selectedNode.importance * 100).toFixed(2)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={selectedNode.importance * 100}
              />
            </Box>

            {selectedNode.tags && selectedNode.tags.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight="bold" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  Tags
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {selectedNode.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Stack>
              </Box>
            )}

            <Box>
              <Typography variant="caption" fontWeight="bold" color="textSecondary">
                Access Count
              </Typography>
              <Typography variant="body2">{selectedNode.accessCount}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" fontWeight="bold" color="textSecondary">
                Created
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                {formatDate(selectedNode.createdAt)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" fontWeight="bold" color="textSecondary">
                Last Accessed
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                {formatDate(selectedNode.lastAccessedAt)}
              </Typography>
            </Box>

            {selectedNode.relatedNodes && selectedNode.relatedNodes.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight="bold" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  Related Nodes ({selectedNode.relatedNodes.length})
                </Typography>
                <Stack spacing={0.5}>
                  {selectedNode.relatedNodes.map((nodeId) => (
                    <Typography key={nodeId} variant="caption" sx={{ wordBreak: 'break-all' }}>
                      {nodeId}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                handleDeleteNode(selectedNode.id);
              }}
              sx={{ mt: 2 }}
            >
              Delete Node
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default MemoryPanel;
