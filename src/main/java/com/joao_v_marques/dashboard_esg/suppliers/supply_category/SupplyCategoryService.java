package com.joao_v_marques.dashboard_esg.suppliers.supply_category;

import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.suppliers.supply_category.dto.SupplyCategoryRequest;
import com.joao_v_marques.dashboard_esg.suppliers.supply_category.dto.SupplyCategoryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SupplyCategoryService {

    private final SupplyCategoryRepository supplyCategoryRepository;

    public SupplyCategoryService(SupplyCategoryRepository supplyCategoryRepository) {
        this.supplyCategoryRepository = supplyCategoryRepository;
    }

    // GET de todas as categorias de fornecimento cadastradas
    @Transactional(readOnly = true)
    public List<SupplyCategoryResponse> findAll() {
        return supplyCategoryRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SupplyCategoryResponse create(SupplyCategoryRequest request) {
        String name = request.name().trim();

        if (supplyCategoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A categoria de fornecimento que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        SupplyCategory supplyCategory = new SupplyCategory();
        supplyCategory.setName(name);

        SupplyCategory saved = supplyCategoryRepository.save(supplyCategory);

        return toResponse(saved);
    }

    @Transactional
    public SupplyCategoryResponse update(Integer supplyCategoryId, SupplyCategoryRequest request) {
        String name = request.name().trim();

        // Valida se a categoria editada realmente existe
        SupplyCategory supplyCategory = supplyCategoryRepository.findById(supplyCategoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma categoria de fornecimento com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!supplyCategory.isActive()) {
            throw new IllegalArgumentException("Não é possível editar uma categoria de fornecimento inativa.");
        }

        if (supplyCategoryRepository.existsByNameIgnoreCaseAndIdNot(name, supplyCategoryId)) {
            throw new ConflictException("Já existe outra categoria de fornecimento cadastrada com este nome");
        }

        // Atualizar a entidade já existente
        supplyCategory.setName(name);

        return toResponse(supplyCategory);
    }

    @Transactional
    public SupplyCategoryResponse deactivate(Integer supplyCategoryId) {
        // Valida se a categoria desativada realmente existe
        SupplyCategory supplyCategory = supplyCategoryRepository.findById(supplyCategoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma categoria de fornecimento com o ID fornecido."));

        if (!supplyCategory.isActive()) {
            throw new IllegalArgumentException("Esta categoria de fornecimento já está inativa.");
        }

        supplyCategory.setActive(false);

        return toResponse(supplyCategory);
    }

    @Transactional
    public SupplyCategoryResponse reactivate(Integer supplyCategoryId) {
        // Valida se a categoria reativada realmente existe
        SupplyCategory supplyCategory = supplyCategoryRepository.findById(supplyCategoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma categoria de fornecimento com o ID fornecido."));

        if (supplyCategory.isActive()) {
            throw new IllegalArgumentException("Esta categoria de fornecimento já está ativa.");
        }

        supplyCategory.setActive(true);

        return toResponse(supplyCategory);
    }

    private SupplyCategoryResponse toResponse(SupplyCategory supplyCategory) {
        return new SupplyCategoryResponse(
                supplyCategory.getId(),
                supplyCategory.getName(),
                supplyCategory.isActive()
        );
    }
}
