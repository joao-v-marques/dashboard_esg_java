package com.joao_v_marques.dashboard_esg.suppliers.supplier;

import com.joao_v_marques.dashboard_esg.suppliers.supplier.dto.SupplierResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SupplierService {

    private final SupplierRepository repository;

    public SupplierService(SupplierRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SupplierResponse> findAll() {
        return repository.findAllByOrderByCreatedAtAscIdAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private SupplierResponse toResponse(Supplier supplier) {
        return new SupplierResponse(
                supplier.getId(),
                supplier.getCnpj(),
                supplier.getCorporateName(),
                supplier.getTradeName(),
                supplier.getStateRegistration(),
                supplier.getSupplyCategory().getId(),
                supplier.getSupplyCategory().getName(),
                supplier.getProductDescription(),
                supplier.getZipCode(),
                supplier.getStreet(),
                supplier.getNumber(),
                supplier.getComplement(),
                supplier.getNeighborhood(),
                supplier.getCity(),
                supplier.getState(),
                supplier.getPhone(),
                supplier.getContactName(),
                supplier.getEmail(),
                supplier.getWebsite(),
                supplier.getBank().getId(),
                supplier.getBank().getName(),
                supplier.getAgency(),
                supplier.getAccount(),
                supplier.getInsertedBy().getName(),
                supplier.getCreatedAt(),
                supplier.getUpdatedAt(),
                supplier.getUpdatedBy() != null ? supplier.getUpdatedBy().getName() : null,
                supplier.isActive()
        );
    }
}
