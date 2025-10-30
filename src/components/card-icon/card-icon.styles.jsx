import styled from "styled-components";
import { ReactComponent as ShoppingSvg } from "../../assets/shopping-bag.svg";

export const ShoppingIcon = styled(ShoppingSvg)`
  width: 1.5rem;
  height: 1.5rem;

  @media (min-width: 768px) {
    width: 2rem;
    height: 2rem;
  }
`;

export const CartIconContainer = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0.25rem;

  @media (min-width: 768px) {
    width: 3rem;
    height: 3rem;
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 50%;
  }
`;

export const ItemCount = styled.span`
  position: absolute;
  bottom: 12px;
  
  
  
  font-size: 0.625rem;
  font-weight: bold;

  

  @media (min-width: 768px) {
    font-size: 0.75rem;
  }
`;
