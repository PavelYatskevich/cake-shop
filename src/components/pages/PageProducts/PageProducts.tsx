import Products from "~/components/pages/PageProducts/components/Products";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function PageProducts() {
  return (
    <Box py={3}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Cakes & desserts
      </Typography>
      <Typography
        variant="subtitle1"
        color="text.secondary"
        align="center"
        paragraph
      >
        Baked fresh — layer cakes, pastries, and sweet treats for every occasion.
      </Typography>
      <Products />
    </Box>
  );
}
