package com.joao_v_marques.dashboard_esg.suppliers.supplier;

import com.joao_v_marques.dashboard_esg.shared.banks.Bank;
import com.joao_v_marques.dashboard_esg.shared.banks.BankRepository;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.suppliers.supplier.dto.SupplierRequest;
import com.joao_v_marques.dashboard_esg.suppliers.supplier.dto.SupplierResponse;
import com.joao_v_marques.dashboard_esg.suppliers.supply_category.SupplyCategory;
import com.joao_v_marques.dashboard_esg.suppliers.supply_category.SupplyCategoryRepository;
import com.joao_v_marques.dashboard_esg.users.user.User;
import com.joao_v_marques.dashboard_esg.users.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class SupplierService {

    private final SupplierRepository repository;
    private final SupplyCategoryRepository supplyCategoryRepository;
    private final BankRepository bankRepository;
    private final UserRepository userRepository;

    public SupplierService(SupplierRepository repository, SupplyCategoryRepository supplyCategoryRepository, BankRepository bankRepository, UserRepository userRepository) {
        this.repository = repository;
        this.supplyCategoryRepository = supplyCategoryRepository;
        this.bankRepository = bankRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<SupplierResponse> findAll() {
        return repository.findAllByOrderByCreatedAtAscIdAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SupplierResponse create(SupplierRequest request, UserPrincipal currentUser) {
        String cnpj = request.cnpj().trim();

        // Validação de duplicidade (coluna UNIQUE)
        if (repository.existsByCnpj(cnpj)) {
            throw new ConflictException("Já existe um fornecedor cadastrado com este CNPJ.");
        }

        // Validação da FK de supplyCategory, precisa existir e estar ativa
        SupplyCategory supplyCategory = supplyCategoryRepository.findById(request.supplyCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma categoria de fornecimento com o ID informado."));
        if (!supplyCategory.isActive()) {
            throw new IllegalArgumentException("A categoria de fornecimento informada está inativa.");
        }

        // Validação da FK de bank, precisa existir e estar ativa
        Bank bank = bankRepository.findById(request.bankId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum banco com o ID informado."));
        if (!bank.isActive()) {
            throw new IllegalArgumentException("O banco informado está inativo.");
        }

        User insertedBy = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado usuário com o ID informado."));

        // Transformar a DTO de request em entidade
        Supplier supplier = new Supplier();
        supplier.setCnpj(cnpj);
        supplier.setCorporateName(request.corporateName().trim());
        supplier.setTradeName(trimToNull(request.tradeName()));
        supplier.setStateRegistration(request.stateRegistration().trim());
        supplier.setSupplyCategory(supplyCategory);
        supplier.setProductDescription(trimToNull(request.productDescription()));
        supplier.setZipCode(trimToNull(request.zipCode()));
        supplier.setStreet(trimToNull(request.street()));
        supplier.setNumber(trimToNull(request.number()));
        supplier.setComplement(trimToNull(request.complement()));
        supplier.setNeighborhood(trimToNull(request.neighborhood()));
        supplier.setCity(trimToNull(request.city()));
        supplier.setState(trimToNull(request.state()));
        supplier.setPhone(request.phone().trim());
        supplier.setContactName(request.contactName().trim());
        supplier.setEmail(request.email().trim());
        supplier.setWebsite(trimToNull(request.website()));
        supplier.setBank(bank);
        supplier.setAgency(request.agency().trim());
        supplier.setAccount(request.account().trim());
        supplier.setInsertedBy(insertedBy);

        repository.save(supplier);

        return toResponse(supplier);
    }

    // Campos opcionais: string em branco vira null no banco
    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
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
